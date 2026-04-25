const STORAGE_KEYS = {
  settings: "ak.settings",
  whitelist: "ak.whitelist",
  auth: "ak.auth",
};

const DEFAULT_SETTINGS = {
  blockVideoAutoplay: true,
  blockAudioAutoplay: true,
  blockIframeAutoplay: true,
  aggressivePlayInterception: true,
};

const DEFAULT_AUTH = {
  apiBaseUrl: "",
  email: "",
  token: "",
  lastSyncAt: "",
  subscriptionActive: false,
};

function getSyncStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(keys, (result) => resolve(result));
  });
}

function setSyncStorage(value) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set(value, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function queryTabs(queryInfo) {
  return new Promise((resolve) => {
    chrome.tabs.query(queryInfo, (tabs) => resolve(tabs || []));
  });
}

function sendMessageToTab(tabId, payload) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, payload, () => {
      resolve();
    });
  });
}

function openOptionsPage() {
  return new Promise((resolve) => {
    chrome.runtime.openOptionsPage(() => resolve());
  });
}

function normalizeDomain(input) {
  const value = (input || "").trim().toLowerCase();
  if (!value) {
    return "";
  }

  const wildcard = value.startsWith("*.") ? "*." : "";
  const base = wildcard ? value.slice(2) : value;

  try {
    const url = new URL(base.includes("//") ? base : `https://${base}`);
    return `${wildcard}${url.hostname}`;
  } catch {
    return "";
  }
}

function sanitizeWhitelist(list) {
  const unique = new Set();
  (Array.isArray(list) ? list : []).forEach((entry) => {
    const cleaned = normalizeDomain(entry);
    if (cleaned) {
      unique.add(cleaned);
    }
  });
  return [...unique].slice(0, 500);
}

async function getState() {
  const result = await getSyncStorage([
    STORAGE_KEYS.settings,
    STORAGE_KEYS.whitelist,
    STORAGE_KEYS.auth,
  ]);

  return {
    settings: {
      ...DEFAULT_SETTINGS,
      ...(result[STORAGE_KEYS.settings] || {}),
    },
    whitelist: sanitizeWhitelist(result[STORAGE_KEYS.whitelist] || []),
    auth: {
      ...DEFAULT_AUTH,
      ...(result[STORAGE_KEYS.auth] || {}),
    },
  };
}

async function saveState(partial) {
  const current = await getState();
  const next = {
    settings: {
      ...current.settings,
      ...(partial.settings || {}),
    },
    whitelist: partial.whitelist
      ? sanitizeWhitelist(partial.whitelist)
      : current.whitelist,
    auth: {
      ...current.auth,
      ...(partial.auth || {}),
    },
  };

  await setSyncStorage({
    [STORAGE_KEYS.settings]: next.settings,
    [STORAGE_KEYS.whitelist]: next.whitelist,
    [STORAGE_KEYS.auth]: next.auth,
  });

  return next;
}

function createApiUrl(baseUrl, pathname) {
  return `${baseUrl.replace(/\/$/, "")}${pathname}`;
}

async function loginAndStore({ apiBaseUrl, email, password }) {
  const response = await fetch(createApiUrl(apiBaseUrl, "/api/extension/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Login failed");
  }

  const nextState = await saveState({
    settings: payload.settings,
    whitelist: payload.whitelist,
    auth: {
      apiBaseUrl,
      email: payload.email || email,
      token: payload.token,
      lastSyncAt: new Date().toISOString(),
      subscriptionActive: true,
    },
  });

  await pushStateToTabs(nextState);
  return nextState;
}

async function pullStateFromServer() {
  const state = await getState();

  if (!state.auth.token || !state.auth.apiBaseUrl) {
    return state;
  }

  const response = await fetch(
    createApiUrl(state.auth.apiBaseUrl, "/api/whitelist/sync"),
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${state.auth.token}`,
      },
    }
  );

  const payload = await response.json();

  if (!response.ok) {
    if (response.status === 401 || response.status === 402) {
      return saveState({
        auth: {
          ...state.auth,
          subscriptionActive: false,
        },
      });
    }
    throw new Error(payload.error || "Sync pull failed");
  }

  const nextState = await saveState({
    whitelist: payload.whitelist,
    settings: payload.settings,
    auth: {
      ...state.auth,
      subscriptionActive: Boolean(payload.active),
      lastSyncAt: new Date().toISOString(),
    },
  });

  await pushStateToTabs(nextState);
  return nextState;
}

async function pushStateToServer() {
  const state = await getState();
  if (!state.auth.token || !state.auth.apiBaseUrl) {
    throw new Error("Not logged in");
  }

  const response = await fetch(
    createApiUrl(state.auth.apiBaseUrl, "/api/whitelist/sync"),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.auth.token}`,
      },
      body: JSON.stringify({
        whitelist: state.whitelist,
        settings: state.settings,
      }),
    }
  );

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Sync push failed");
  }

  const nextState = await saveState({
    whitelist: payload.whitelist,
    settings: payload.settings,
    auth: {
      ...state.auth,
      lastSyncAt: new Date().toISOString(),
      subscriptionActive: true,
    },
  });

  await pushStateToTabs(nextState);
  return nextState;
}

async function pushStateToTabs(state) {
  const tabs = await queryTabs({});
  const tabsWithIds = tabs.filter((tab) => Number.isInteger(tab.id));

  await Promise.all(
    tabsWithIds.map((tab) =>
      sendMessageToTab(tab.id, {
          type: "STATE_UPDATED",
          payload: {
            settings: state.settings,
            whitelist: state.whitelist,
          },
        })
    )
  );
}

async function ensureDefaults() {
  const state = await getState();
  await saveState(state);
}

chrome.runtime.onInstalled.addListener(async () => {
  await ensureDefaults();
  chrome.alarms.create("ak.periodicSync", {
    periodInMinutes: 15,
  });
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureDefaults();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "ak.periodicSync") {
    return;
  }

  try {
    await pullStateFromServer();
  } catch (error) {
    console.warn("Autoplay Media Killer periodic sync failed", error);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    const state = await getState();

    if (message.type === "GET_STATE") {
      let currentDomain = "";
      const tabUrl = sender?.tab?.url;
      if (tabUrl) {
        try {
          currentDomain = new URL(tabUrl).hostname.toLowerCase();
        } catch {
          currentDomain = "";
        }
      }

      sendResponse({
        ok: true,
        state,
        currentDomain,
      });
      return;
    }

    if (message.type === "UPDATE_SETTINGS") {
      const nextState = await saveState({ settings: message.payload || {} });
      await pushStateToTabs(nextState);
      sendResponse({ ok: true, state: nextState });
      return;
    }

    if (message.type === "SAVE_WHITELIST") {
      const nextState = await saveState({ whitelist: message.payload || [] });
      await pushStateToTabs(nextState);
      sendResponse({ ok: true, state: nextState });
      return;
    }

    if (message.type === "TOGGLE_DOMAIN") {
      const domain = normalizeDomain(message.payload?.domain || "");
      if (!domain) {
        sendResponse({ ok: false, error: "Invalid domain" });
        return;
      }

      const exists = state.whitelist.includes(domain);
      const nextWhitelist = exists
        ? state.whitelist.filter((item) => item !== domain)
        : [...state.whitelist, domain];

      const nextState = await saveState({ whitelist: nextWhitelist });
      await pushStateToTabs(nextState);
      sendResponse({ ok: true, state: nextState, whitelisted: !exists });
      return;
    }

    if (message.type === "LOGIN") {
      const payload = message.payload || {};
      const nextState = await loginAndStore({
        apiBaseUrl: payload.apiBaseUrl,
        email: payload.email,
        password: payload.password,
      });
      sendResponse({ ok: true, state: nextState });
      return;
    }

    if (message.type === "SET_TOKEN") {
      const payload = message.payload || {};
      const nextState = await saveState({
        auth: {
          ...state.auth,
          apiBaseUrl: payload.apiBaseUrl || state.auth.apiBaseUrl,
          token: payload.token || state.auth.token,
          email: payload.email || state.auth.email,
        },
      });
      sendResponse({ ok: true, state: nextState });
      return;
    }

    if (message.type === "SYNC_NOW") {
      const nextState = await pullStateFromServer();
      sendResponse({ ok: true, state: nextState });
      return;
    }

    if (message.type === "PUSH_SYNC") {
      const nextState = await pushStateToServer();
      sendResponse({ ok: true, state: nextState });
      return;
    }

    if (message.type === "LOGOUT") {
      const nextState = await saveState({ auth: { ...DEFAULT_AUTH } });
      sendResponse({ ok: true, state: nextState });
      return;
    }

    if (message.type === "OPEN_OPTIONS") {
      await openOptionsPage();
      sendResponse({ ok: true });
      return;
    }

    sendResponse({ ok: false, error: "Unknown message type" });
  })().catch((error) => {
    sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
  });

  return true;
});
