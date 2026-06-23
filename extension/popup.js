(() => {
  const ext = globalThis.browser || globalThis.chrome;
  const DEBUG = true;
  const firebase = window.WatchPartyFirebase;
  let authUser = null;
  let roomId = null;
  let chat = null;
  let firebaseState = { status: "connecting", message: "Firebase: Connecting..." };

  const SUPPORTED_HOSTS = [
    "youtube.com",
    "youtu.be",
    "netflix.com",
    "disneyplus.com",
    "primevideo.com",
    "amazon.com",
    "hulu.com",
    "max.com",
    "hbomax.com",
    "paramountplus.com"
  ];

  const els = {
    displayName: document.getElementById("displayName"),
    joinCode: document.getElementById("joinCode"),
    createRoom: document.getElementById("createRoom"),
    joinRoom: document.getElementById("joinRoom"),
    leaveRoom: document.getElementById("leaveRoom"),
    currentRoom: document.getElementById("currentRoom"),
    connectionStatus: document.getElementById("connectionStatus"),
    platformStatus: document.getElementById("platformStatus"),
    chatMessages: document.getElementById("chatMessages"),
    chatInput: document.getElementById("chatInput"),
    sendChat: document.getElementById("sendChat"),
    callStatus: document.getElementById("callStatus"),
    startCall: document.getElementById("startCall"),
    endCall: document.getElementById("endCall"),
    toggleMute: document.getElementById("toggleMute"),
    toggleCamera: document.getElementById("toggleCamera")
  };

  async function init() {
    try {
      bindEvents();
      setFirebaseState("connecting", "Firebase: Connecting...");
      authUser = await firebase.signInAnonymously();
      setFirebaseState("connected", "Firebase: Connected");
      const stored = await firebase.storage.get([firebase.ROOM_KEY, firebase.DISPLAY_NAME_KEY]);
      roomId = stored[firebase.ROOM_KEY] || null;
      els.displayName.value = stored[firebase.DISPLAY_NAME_KEY] || `Guest-${authUser.localId.slice(0, 4)}`;
      updateRoomUi();
      if (roomId) startChat();
      await refreshTabStatus();
    } catch (error) {
      console.error("WatchParty popup init failed", error);
      setFirebaseState("error", mapFirebaseError(error) || "Firebase error: unknown");
      els.platformStatus.textContent = "Room setup does not require a streaming tab.";
      els.callStatus.textContent = "Fix Firebase/auth setup, then retry Create or Join.";
    }
  }

  function bindEvents() {
    els.displayName.addEventListener("change", saveDisplayName);
    els.createRoom.addEventListener("click", createRoom);
    els.joinRoom.addEventListener("click", joinRoom);
    els.leaveRoom.addEventListener("click", leaveRoom);
    els.sendChat.addEventListener("click", sendChat);
    els.chatInput.addEventListener("keydown", (event) => { if (event.key === "Enter") sendChat(); });
    els.startCall.addEventListener("click", async () => { await sendToActiveTab({ type: "WATCHPARTY_START_CALL" }); refreshTabStatus(); });
    els.endCall.addEventListener("click", async () => { await sendToActiveTab({ type: "WATCHPARTY_END_CALL" }); refreshTabStatus(); });
    els.toggleMute.addEventListener("click", async () => { await sendToActiveTab({ type: "WATCHPARTY_TOGGLE_MUTE" }); refreshTabStatus(); });
    els.toggleCamera.addEventListener("click", async () => { await sendToActiveTab({ type: "WATCHPARTY_TOGGLE_CAMERA" }); refreshTabStatus(); });
    
    document.getElementById("roomCodeContainer")?.addEventListener("click", () => {
      if (roomId && roomId !== "None") {
        navigator.clipboard.writeText(roomId).then(() => {
          const icon = document.querySelector(".copy-icon");
          if (icon) {
            icon.textContent = "✓";
            setTimeout(() => { icon.textContent = "📋"; }, 2000);
          }
        }).catch(() => undefined);
      }
    });
  }

  async function saveDisplayName() {
    const displayName = getDisplayName();
    await firebase.storage.set({ [firebase.DISPLAY_NAME_KEY]: displayName });
    if (roomId) {
      await firebase.ensureRoom(roomId, displayName);
      await sendToActiveTab({ type: "WATCHPARTY_JOIN_ROOM", roomId, displayName });
    }
  }

  async function createRoom() {
    try {
      if (DEBUG) console.log("Create room clicked");
      await ensureAuth();
      await enterRoom(firebase.createRoomCode());
    } catch (error) {
      handleActionError("Room create failed.", error);
    }
  }

  async function joinRoom() {
    const code = els.joinCode.value.trim().toUpperCase();
    if (!code) return setStatus("Enter a room code first.");
    try {
      if (DEBUG) console.log("Join room clicked", { roomId: code });
      await ensureAuth();
      await enterRoom(code);
    } catch (error) {
      handleActionError("Room join failed.", error);
    }
  }

  async function ensureAuth() {
    if (authUser && firebaseState.status === "connected") return authUser;
    setFirebaseState("connecting", "Firebase: Connecting...");
    authUser = await firebase.signInAnonymously();
    setFirebaseState("connected", "Firebase: Connected");
    return authUser;
  }

  async function enterRoom(code) {
    if (DEBUG) console.log("Create room attempted", { roomId: code, displayName: getDisplayName() });
    await firebase.ensureRoom(code, getDisplayName());
    if (DEBUG) console.log("Create room success", { roomId: code });
    roomId = code;
    updateRoomUi();
    startChat();
    const tabResult = await sendToActiveTab({ type: "WATCHPARTY_JOIN_ROOM", roomId, displayName: getDisplayName() });
    if (tabResult === null) {
      setStatus("Room ready. Open YouTube or a supported streaming site.");
      return;
    }
    setStatus("Room connected.");
  }

  async function leaveRoom() {
    if (!roomId) return;
    await firebase.leaveRoom(roomId, getDisplayName());
    await sendToActiveTab({ type: "WATCHPARTY_LEAVE_ROOM" });
    chat?.stop();
    chat = null;
    roomId = null;
    renderMessages([]);
    updateRoomUi();
    setStatus("Left room.");
  }

  function startChat() {
    chat?.stop();
    chat = new window.WatchPartyChatManager({
      firebase,
      roomId,
      userId: authUser.localId,
      getDisplayName,
      onMessages: renderMessages,
      onError: (error) => setStatus(mapFirebaseError(error) || error.message)
    });
    chat.start();
  }

  async function sendChat() {
    const text = els.chatInput.value;
    if (!text.trim()) return;
    if (!roomId) return setStatus("Join a room before chatting.");
    await chat?.send(text);
    els.chatInput.value = "";
  }

  function renderMessages(messages) {
    els.chatMessages.innerHTML = messages.map((message) => `
      <div class="chat-message">
        <strong>${escapeHtml(message.displayName || "Guest")}</strong>
        <span>${escapeHtml(message.text || "")}</span><br>
        <small>${new Date(message.createdAt || Date.now()).toLocaleTimeString()}</small>
      </div>`).join("");
    els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
  }

  async function refreshTabStatus() {
    const activeTab = await getActiveTab();
    const pageSupported = isSupportedTab(activeTab);
    const response = await sendToActiveTab({ type: "WATCHPARTY_STATUS" });
    if (response?.platform) {
      els.platformStatus.textContent = `${response.platform}: ${response.canControl ? "ready to sync" : "waiting for video"}`;
      els.callStatus.textContent = roomId ? "Call controls target this tab." : "Join a room before starting a call.";
      updateCallUi(response.callActive, response.micMuted, response.cameraOff);
    } else if (pageSupported) {
      els.platformStatus.textContent = "Supported page found. Refresh the page if controls are unavailable.";
      els.callStatus.textContent = "Open the video tab and start playback once to initialize controls.";
      updateCallUi(false, false, false);
    } else {
      els.platformStatus.textContent = "Open YouTube or a supported streaming site.";
      updateCallUi(false, false, false);
    }
  }

  async function getActiveTab() {
    if (!ext?.tabs?.query) return null;
    try {
      const result = await ext.tabs.query({ active: true, currentWindow: true });
      return Array.isArray(result) ? result[0] : null;
    } catch (error) {
      console.error("Active tab query failed", error);
      return null;
    }
  }

  async function sendToActiveTab(message) {
    const tab = await getActiveTab();
    if (!tab?.id) return null;
    try {
      return await ext.tabs.sendMessage(tab.id, message);
    } catch (error) {
      console.debug("WatchParty tab messaging unavailable", { tabId: tab.id, type: message?.type, error: error?.message });
      // Content script not loaded on this tab — return null to let caller handle it.
      return null;
    }
  }

  function isSupportedTab(tab) {
    if (!tab?.url) return false;
    try {
      const host = new URL(tab.url).hostname.toLowerCase();
      return SUPPORTED_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`));
    } catch {
      return false;
    }
  }

  function getDisplayName() {
    return els.displayName.value.trim().slice(0, 32) || "Guest";
  }

  function updateRoomUi() {
    els.currentRoom.textContent = roomId || "None";
    els.leaveRoom.disabled = !roomId;
    setStatus(roomId ? "Room: In room" : "Room: Not in room");
    
    if (roomId) {
      document.body.classList.remove("wp-no-room");
      document.body.classList.add("wp-in-room");
    } else {
      document.body.classList.remove("wp-in-room");
      document.body.classList.add("wp-no-room");
    }
  }

  function updateCallUi(active, micMuted, cameraOff) {
    els.startCall.style.display = active ? "none" : "block";
    els.endCall.style.display = active ? "block" : "none";
    els.toggleMute.style.display = active ? "block" : "none";
    els.toggleCamera.style.display = active ? "block" : "none";

    els.toggleMute.textContent = micMuted ? "Unmute mic" : "Mute mic";
    els.toggleMute.classList.toggle("warning", micMuted);

    els.toggleCamera.textContent = cameraOff ? "Camera on" : "Camera off";
    els.toggleCamera.classList.toggle("warning", cameraOff);
  }

  function setStatus(text) {
    if (firebaseState.status === "error" && !text.startsWith("Firebase")) {
      els.connectionStatus.textContent = firebaseState.message || "Firebase error: unknown";
      return;
    }
    els.connectionStatus.textContent = text.startsWith("Firebase:")
      ? text
      : `${firebaseState.message} | ${text}`;
  }

  function setFirebaseState(status, message) {
    firebaseState = { status, message };
    setStatus(roomId ? "Room: In room" : "Room: Not in room");
  }

  function handleActionError(prefix, error) {
    console.error(prefix, error);
    const friendly = mapFirebaseError(error);
    const firebaseError = Boolean(friendly);
    if (firebaseError) {
      setFirebaseState("error", friendly);
      setStatus(friendly);
    } else {
      setStatus(`${prefix} ${error?.message || "Try again."}`);
    }
  }

  function mapFirebaseError(error) {
    const code = String(error?.code || "");
    const message = String(error?.message || "");
    const details = String(error?.details || "");
    const merged = `${code} ${message} ${details}`.toLowerCase();

    if (code === "auth/operation-not-allowed" || merged.includes("operation-not-allowed")) {
      return "Anonymous Authentication is not enabled.";
    }
    if (code === "auth/configuration-not-found" || merged.includes("configuration-not-found")) {
      return "Firebase Auth error: auth/configuration-not-found";
    }
    if (code === "database/permission-denied" || merged.includes("permission_denied") || merged.includes("permission denied")) {
      return "Permission denied. Check Realtime Database rules.";
    }
    if (code === "app/missing-database-url" || merged.includes("database url is missing")) {
      return "Realtime Database URL is missing or incorrect.";
    }
    if (code === "database/incorrect-url" || merged.includes("different region") || merged.includes("correcturl")) {
      return "Realtime Database URL is missing or incorrect.";
    }
    if (code === "firebase/network-or-csp" || merged.includes("failed to fetch") || merged.includes("networkerror")) {
      return "Network or CSP error. Check extension console.";
    }
    if (code.startsWith("auth/")) {
      return `Firebase Auth error: ${code}`;
    }
    if (code.startsWith("database/")) {
      return `Database error: ${code}`;
    }
    if (merged.includes("network-request-failed")) {
      return "Firebase Auth error: auth/network-request-failed";
    }
    if (merged.includes("app/no-app")) {
      return "Firebase Auth error: app/no-app";
    }
    if (merged.includes("content security policy") || merged.includes("csp")) {
      return "Firebase connection blocked by Content Security Policy.";
    }
    if (merged.includes("firebase")) {
      return "Firebase error: unknown";
    }
    return null;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    }[char]));
  }

  init();
})();
