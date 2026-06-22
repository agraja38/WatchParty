(() => {
  const firebase = window.WatchPartyFirebase;
  let authUser = null;
  let roomId = null;
  let chat = null;

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
    authUser = await firebase.signInAnonymously();
    const stored = await firebase.storage.get([firebase.ROOM_KEY, firebase.DISPLAY_NAME_KEY]);
    roomId = stored[firebase.ROOM_KEY] || null;
    els.displayName.value = stored[firebase.DISPLAY_NAME_KEY] || `Guest-${authUser.localId.slice(0, 4)}`;
    updateRoomUi();
    if (roomId) startChat();
    bindEvents();
    refreshTabStatus();
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
    await enterRoom(firebase.createRoomCode());
  }

  async function joinRoom() {
    const code = els.joinCode.value.trim().toUpperCase();
    if (!code) return setStatus("Enter a room code first.");
    await enterRoom(code);
  }

  async function enterRoom(code) {
    roomId = code;
    await firebase.ensureRoom(roomId, getDisplayName());
    updateRoomUi();
    startChat();
    const tabResult = await sendToActiveTab({ type: "WATCHPARTY_JOIN_ROOM", roomId, displayName: getDisplayName() });
    if (tabResult === null) {
      setStatus("Room ready. Open a supported streaming tab to sync playback.");
      return;
    }
    setStatus("Connected");
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
    setStatus("Disconnected");
  }

  function startChat() {
    chat?.stop();
    chat = new window.WatchPartyChatManager({
      firebase,
      roomId,
      userId: authUser.localId,
      getDisplayName,
      onMessages: renderMessages,
      onError: (error) => setStatus(error.message)
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
    const response = await sendToActiveTab({ type: "WATCHPARTY_STATUS" });
    if (response?.platform) {
      els.platformStatus.textContent = `${response.platform}: ${response.canControl ? "ready to sync" : "waiting for video"}`;
      els.callStatus.textContent = roomId ? "Call controls target this tab." : "Join a room before starting a call.";
      updateCallUi(response.callActive, response.micMuted, response.cameraOff);
    } else {
      els.platformStatus.textContent = "Open a supported streaming tab to sync playback.";
      updateCallUi(false, false, false);
    }
  }

  async function sendToActiveTab(message) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return null;
    try {
      return await chrome.tabs.sendMessage(tab.id, message);
    } catch (error) {
      setStatus("Open a supported streaming tab first.");
      return null;
    }
  }

  function getDisplayName() {
    return els.displayName.value.trim().slice(0, 32) || "Guest";
  }

  function updateRoomUi() {
    els.currentRoom.textContent = roomId || "None";
    els.leaveRoom.disabled = !roomId;
    setStatus(roomId ? "Connected" : "Disconnected");
    
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
    els.connectionStatus.textContent = text;
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

  init().catch((error) => setStatus(error.message));
})();
