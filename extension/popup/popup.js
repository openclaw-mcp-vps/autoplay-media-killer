const elements = {
  currentDomain: document.getElementById("current-domain"),
  toggleDomain: document.getElementById("toggle-domain"),
  blockVideo: document.getElementById("block-video"),
  blockAudio: document.getElementById("block-audio"),
  blockIframe: document.getElementById("block-iframe"),
  syncNow: document.getElementById("sync-now"),
  openOptions: document.getElementById("open-options"),
  status: document.getElementById("status"),
};

let state = null;
let currentDomain = "";

function sendMessage(type, payload) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, payload }, (response) => {
      resolve(response || { ok: false, error: "No response" });
    });
  });
}

function setStatus(message) {
  elements.status.textContent = message || "";
}

function domainIsWhitelisted() {
  if (!currentDomain || !state) {
    return false;
  }

  return state.whitelist.some((entry) => {
    if (entry.startsWith("*.")) {
      const suffix = entry.slice(2);
      return currentDomain === suffix || currentDomain.endsWith(`.${suffix}`);
    }
    return entry === currentDomain;
  });
}

function render() {
  if (!state) {
    return;
  }

  elements.currentDomain.textContent = currentDomain || "Not available";
  elements.blockVideo.checked = Boolean(state.settings.blockVideoAutoplay);
  elements.blockAudio.checked = Boolean(state.settings.blockAudioAutoplay);
  elements.blockIframe.checked = Boolean(state.settings.blockIframeAutoplay);

  const whitelisted = domainIsWhitelisted();
  elements.toggleDomain.textContent = whitelisted
    ? "Remove from whitelist"
    : "Allow this domain";
}

async function refreshState() {
  const response = await sendMessage("GET_STATE");
  if (!response.ok) {
    setStatus(response.error || "Could not load extension state.");
    return;
  }

  state = response.state;
  currentDomain = response.currentDomain || "";
  render();
}

async function updateSettings() {
  const response = await sendMessage("UPDATE_SETTINGS", {
    blockVideoAutoplay: elements.blockVideo.checked,
    blockAudioAutoplay: elements.blockAudio.checked,
    blockIframeAutoplay: elements.blockIframe.checked,
  });

  if (!response.ok) {
    setStatus(response.error || "Could not save settings.");
    return;
  }

  state = response.state;
  setStatus("Settings updated.");
  render();
}

async function toggleDomain() {
  if (!currentDomain) {
    setStatus("Current tab has no valid domain.");
    return;
  }

  const response = await sendMessage("TOGGLE_DOMAIN", { domain: currentDomain });
  if (!response.ok) {
    setStatus(response.error || "Could not update whitelist.");
    return;
  }

  state = response.state;
  setStatus(response.whitelisted ? "Domain allowed." : "Domain blocked again.");
  render();
}

async function syncNow() {
  elements.syncNow.disabled = true;
  setStatus("Syncing with server...");

  const response = await sendMessage("SYNC_NOW");
  elements.syncNow.disabled = false;

  if (!response.ok) {
    setStatus(response.error || "Sync failed. Configure login in options.");
    return;
  }

  state = response.state;
  setStatus("Synced from dashboard.");
  render();
}

elements.blockVideo.addEventListener("change", updateSettings);
elements.blockAudio.addEventListener("change", updateSettings);
elements.blockIframe.addEventListener("change", updateSettings);
elements.toggleDomain.addEventListener("click", toggleDomain);
elements.syncNow.addEventListener("click", syncNow);
elements.openOptions.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "OPEN_OPTIONS" });
});

refreshState();
