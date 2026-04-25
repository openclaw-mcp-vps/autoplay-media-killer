const el = {
  apiBaseUrl: document.getElementById("api-base-url"),
  email: document.getElementById("email"),
  password: document.getElementById("password"),
  token: document.getElementById("token"),
  blockVideo: document.getElementById("block-video"),
  blockAudio: document.getElementById("block-audio"),
  blockIframe: document.getElementById("block-iframe"),
  aggressive: document.getElementById("aggressive"),
  whitelist: document.getElementById("whitelist"),
  login: document.getElementById("login"),
  saveToken: document.getElementById("save-token"),
  logout: document.getElementById("logout"),
  saveLocal: document.getElementById("save-local"),
  pullSync: document.getElementById("pull-sync"),
  pushSync: document.getElementById("push-sync"),
  status: document.getElementById("status"),
};

let state = null;

function sendMessage(type, payload) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, payload }, (response) => {
      resolve(response || { ok: false, error: "No response" });
    });
  });
}

function setStatus(message) {
  el.status.textContent = message;
}

function listToTextarea(items) {
  return (Array.isArray(items) ? items : []).join("\n");
}

function textareaToList(raw) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function render() {
  if (!state) {
    return;
  }

  el.apiBaseUrl.value = state.auth.apiBaseUrl || "";
  el.email.value = state.auth.email || "";
  el.token.value = state.auth.token || "";
  el.password.value = "";

  el.blockVideo.checked = Boolean(state.settings.blockVideoAutoplay);
  el.blockAudio.checked = Boolean(state.settings.blockAudioAutoplay);
  el.blockIframe.checked = Boolean(state.settings.blockIframeAutoplay);
  el.aggressive.checked = Boolean(state.settings.aggressivePlayInterception);
  el.whitelist.value = listToTextarea(state.whitelist);
}

function collectSettings() {
  return {
    blockVideoAutoplay: el.blockVideo.checked,
    blockAudioAutoplay: el.blockAudio.checked,
    blockIframeAutoplay: el.blockIframe.checked,
    aggressivePlayInterception: el.aggressive.checked,
  };
}

async function refreshState() {
  const response = await sendMessage("GET_STATE");
  if (!response.ok) {
    setStatus(response.error || "Could not load extension state.");
    return;
  }
  state = response.state;
  render();
}

async function persistLocalState() {
  const updateSettingsResponse = await sendMessage("UPDATE_SETTINGS", collectSettings());
  if (!updateSettingsResponse.ok) {
    throw new Error(updateSettingsResponse.error || "Failed to update settings");
  }

  const saveWhitelistResponse = await sendMessage(
    "SAVE_WHITELIST",
    textareaToList(el.whitelist.value)
  );
  if (!saveWhitelistResponse.ok) {
    throw new Error(saveWhitelistResponse.error || "Failed to save whitelist");
  }

  state = saveWhitelistResponse.state;
}

el.login.addEventListener("click", async () => {
  setStatus("Logging in...");
  try {
    const response = await sendMessage("LOGIN", {
      apiBaseUrl: el.apiBaseUrl.value.trim(),
      email: el.email.value.trim(),
      password: el.password.value,
    });

    if (!response.ok) {
      throw new Error(response.error || "Login failed");
    }

    state = response.state;
    render();
    setStatus("Connected. Settings pulled from dashboard.");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error));
  }
});

el.saveToken.addEventListener("click", async () => {
  setStatus("Saving token...");
  const response = await sendMessage("SET_TOKEN", {
    apiBaseUrl: el.apiBaseUrl.value.trim(),
    email: el.email.value.trim(),
    token: el.token.value.trim(),
  });

  if (!response.ok) {
    setStatus(response.error || "Could not save token.");
    return;
  }

  state = response.state;
  render();
  setStatus("Token saved.");
});

el.logout.addEventListener("click", async () => {
  const response = await sendMessage("LOGOUT");
  if (!response.ok) {
    setStatus(response.error || "Could not disconnect.");
    return;
  }

  state = response.state;
  render();
  setStatus("Disconnected from dashboard account.");
});

el.saveLocal.addEventListener("click", async () => {
  setStatus("Saving local settings...");
  try {
    await persistLocalState();
    setStatus("Local settings saved.");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error));
  }
});

el.pullSync.addEventListener("click", async () => {
  setStatus("Pulling from dashboard...");
  const response = await sendMessage("SYNC_NOW");
  if (!response.ok) {
    setStatus(response.error || "Could not pull settings.");
    return;
  }

  state = response.state;
  render();
  setStatus("Dashboard settings pulled successfully.");
});

el.pushSync.addEventListener("click", async () => {
  setStatus("Pushing to dashboard...");

  try {
    await persistLocalState();
    const response = await sendMessage("PUSH_SYNC");
    if (!response.ok) {
      throw new Error(response.error || "Push sync failed");
    }

    state = response.state;
    render();
    setStatus("Dashboard updated with local extension settings.");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error));
  }
});

refreshState();
