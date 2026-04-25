(() => {
  const DEFAULT_SETTINGS = {
    blockVideoAutoplay: true,
    blockAudioAutoplay: true,
    blockIframeAutoplay: true,
    aggressivePlayInterception: true,
  };

  const STORAGE_KEYS = {
    settings: "ak.settings",
    whitelist: "ak.whitelist",
  };

  const currentHostname = window.location.hostname.toLowerCase();
  let settings = { ...DEFAULT_SETTINGS };
  let whitelist = [];
  let lastInteractionAt = 0;

  const markerKey = "__akGuarded";

  function normalizeDomain(input) {
    const value = (input || "").trim().toLowerCase();
    if (!value) {
      return "";
    }

    const wildcard = value.startsWith("*.") ? "*." : "";
    const hostCandidate = wildcard ? value.slice(2) : value;

    try {
      const url = new URL(hostCandidate.includes("//") ? hostCandidate : `https://${hostCandidate}`);
      return `${wildcard}${url.hostname}`;
    } catch {
      return "";
    }
  }

  function sanitizeWhitelist(list) {
    const unique = new Set();
    (Array.isArray(list) ? list : []).forEach((item) => {
      const normalized = normalizeDomain(item);
      if (normalized) {
        unique.add(normalized);
      }
    });
    return [...unique];
  }

  function isWhitelistedHost(hostname) {
    return whitelist.some((rule) => {
      if (rule.startsWith("*.")) {
        const suffix = rule.slice(2);
        return hostname === suffix || hostname.endsWith(`.${suffix}`);
      }
      return hostname === rule;
    });
  }

  function userGestureIsRecent() {
    return Date.now() - lastInteractionAt <= 1200;
  }

  function shouldBlockElement(mediaElement) {
    if (isWhitelistedHost(currentHostname)) {
      return false;
    }

    const isVideo = mediaElement.tagName.toLowerCase() === "video";
    const isAudio = mediaElement.tagName.toLowerCase() === "audio";

    if (isVideo && settings.blockVideoAutoplay) {
      return true;
    }

    if (isAudio && settings.blockAudioAutoplay) {
      return true;
    }

    if (isVideo && settings.blockAudioAutoplay && !mediaElement.muted) {
      return true;
    }

    return false;
  }

  function enforceBlock(mediaElement) {
    if (!(mediaElement instanceof HTMLMediaElement)) {
      return;
    }

    if (!shouldBlockElement(mediaElement)) {
      return;
    }

    mediaElement.autoplay = false;
    mediaElement.removeAttribute("autoplay");

    if (!mediaElement.paused && !userGestureIsRecent()) {
      mediaElement.pause();
      if (Number.isFinite(mediaElement.currentTime) && mediaElement.currentTime > 0.1) {
        mediaElement.currentTime = 0;
      }
    }
  }

  function guardMediaElement(element) {
    if (!(element instanceof HTMLMediaElement)) {
      return;
    }

    if (element[markerKey]) {
      return;
    }

    element[markerKey] = true;

    enforceBlock(element);

    element.addEventListener(
      "play",
      () => {
        if (!userGestureIsRecent()) {
          enforceBlock(element);
        }
      },
      true
    );

    element.addEventListener(
      "loadedmetadata",
      () => {
        enforceBlock(element);
      },
      true
    );

    element.addEventListener(
      "canplay",
      () => {
        enforceBlock(element);
      },
      true
    );
  }

  function patchPlayMethod() {
    if (!settings.aggressivePlayInterception) {
      return;
    }

    if (HTMLMediaElement.prototype.__akPlayPatched) {
      return;
    }

    const originalPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...args) {
      if (!userGestureIsRecent() && shouldBlockElement(this)) {
        this.pause();
        return Promise.reject(
          new DOMException("Autoplay blocked by Autoplay Media Killer", "NotAllowedError")
        );
      }

      return originalPlay.apply(this, args);
    };

    HTMLMediaElement.prototype.__akPlayPatched = true;
  }

  function sanitizeIframe(iframe) {
    if (!(iframe instanceof HTMLIFrameElement)) {
      return;
    }

    if (!settings.blockIframeAutoplay || isWhitelistedHost(currentHostname)) {
      return;
    }

    const src = iframe.getAttribute("src");
    if (src) {
      try {
        const url = new URL(src, window.location.href);
        if (url.searchParams.has("autoplay")) {
          url.searchParams.set("autoplay", "0");
          iframe.setAttribute("src", url.toString());
        }
      } catch {
        // Ignore invalid iframe src values.
      }
    }

    const allow = iframe.getAttribute("allow");
    if (allow && allow.includes("autoplay")) {
      const updated = allow
        .split(";")
        .map((entry) => entry.trim())
        .filter((entry) => entry && entry !== "autoplay")
        .join("; ");

      if (updated) {
        iframe.setAttribute("allow", updated);
      } else {
        iframe.removeAttribute("allow");
      }
    }
  }

  function scanDocument() {
    document.querySelectorAll("video, audio").forEach((element) => {
      guardMediaElement(element);
      enforceBlock(element);
    });

    document.querySelectorAll("iframe").forEach((iframe) => {
      sanitizeIframe(iframe);
    });
  }

  function handleMutations(mutations) {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) {
            return;
          }

          if (node.matches("video, audio")) {
            guardMediaElement(node);
            enforceBlock(node);
          }

          if (node.matches("iframe")) {
            sanitizeIframe(node);
          }

          node.querySelectorAll?.("video, audio").forEach((element) => {
            guardMediaElement(element);
            enforceBlock(element);
          });

          node.querySelectorAll?.("iframe").forEach((iframe) => {
            sanitizeIframe(iframe);
          });
        });
      }

      if (
        mutation.type === "attributes" &&
        mutation.target instanceof HTMLMediaElement
      ) {
        enforceBlock(mutation.target);
      }

      if (
        mutation.type === "attributes" &&
        mutation.target instanceof HTMLIFrameElement
      ) {
        sanitizeIframe(mutation.target);
      }
    });
  }

  function refreshFromStorage() {
    chrome.storage.sync.get([STORAGE_KEYS.settings, STORAGE_KEYS.whitelist], (result) => {
      settings = {
        ...DEFAULT_SETTINGS,
        ...(result[STORAGE_KEYS.settings] || {}),
      };

      whitelist = sanitizeWhitelist(result[STORAGE_KEYS.whitelist] || []);
      patchPlayMethod();
      scanDocument();
    });
  }

  ["keydown", "pointerdown", "touchstart", "mousedown"].forEach((eventName) => {
    document.addEventListener(
      eventName,
      () => {
        lastInteractionAt = Date.now();
      },
      true
    );
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync") {
      return;
    }

    if (changes[STORAGE_KEYS.settings] || changes[STORAGE_KEYS.whitelist]) {
      refreshFromStorage();
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type !== "STATE_UPDATED") {
      return;
    }

    settings = {
      ...DEFAULT_SETTINGS,
      ...(message.payload?.settings || {}),
    };
    whitelist = sanitizeWhitelist(message.payload?.whitelist || []);
    patchPlayMethod();
    scanDocument();
  });

  const observer = new MutationObserver(handleMutations);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["autoplay", "src", "allow"],
  });

  refreshFromStorage();
})();
