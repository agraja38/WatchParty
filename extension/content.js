(() => {
  const ext = globalThis.browser || globalThis.chrome;
  const firebase = window.WatchPartyFirebase;
  let authUser = null;
  let roomId = null;
  let displayName = "Guest";
  let adapter = null;
  let sync = null;
  let chat = null;
  let webrtc = null;
  let ui = null;
  let detectTimer = null;
  let lastHref = location.href;

  async function boot() {
    console.log("WatchParty content script loaded");
    authUser = await firebase.signInAnonymously();
    const stored = await firebase.storage.get([firebase.ROOM_KEY, firebase.DISPLAY_NAME_KEY]);
    displayName = stored[firebase.DISPLAY_NAME_KEY] || "Guest";
    ensureUi();
    selectAdapter();
    if (stored[firebase.ROOM_KEY]) {
      await joinRoom(stored[firebase.ROOM_KEY], displayName);
    } else {
      ui.setRoomStatus("No room joined");
      ui.setVisible(false);
    }
    watchNavigation();
    window.addEventListener("beforeunload", () => {
      if (roomId) firebase.update(`rooms/${roomId}/users/${authUser.localId}`, { online: false }).catch(() => undefined);
    });
  }

  function ensureUi() {
    if (ui) return;
    ui = new window.WatchPartyOverlayUI({
      onSendChat: (text) => chat?.send(text),
      onStartCall: () => startCall(),
      onEndCall: () => webrtc?.end(),
      onToggleMute: () => webrtc?.toggleMute(),
      onToggleCamera: () => webrtc?.toggleCamera()
    });
    ui.setVisible(Boolean(roomId));
  }

  function selectAdapter() {
    const candidates = window.WatchPartyAdapters || [];
    adapter = candidates.find((candidate) => candidate.name !== "Generic HTML5" && candidate.matchesLocation(location))
      || candidates.find((candidate) => candidate.name === "Generic HTML5" && candidate.matchesLocation(location))
      || candidates.find((candidate) => candidate.name === "Generic HTML5");
    ui?.setPlatform(adapter?.name || "Unsupported");
    if (adapter && !adapter.canControl()) {
      ui?.setSyncStatus("waiting for a safe HTML5 video element");
    }
    return adapter;
  }

  async function joinRoom(nextRoomId, nextDisplayName) {
    roomId = String(nextRoomId || "").trim().toUpperCase();
    displayName = String(nextDisplayName || "Guest").trim() || "Guest";
    if (!roomId) return;

    authUser = authUser || await firebase.signInAnonymously();
    await firebase.ensureRoom(roomId, displayName);
    ensureUi();
    ui.setRoomStatus(`Room ${roomId} as ${displayName}`);
    ui.setVisible(true);
    startChat();
    startSyncWhenReady();
  }

  function startChat() {
    chat?.stop();
    chat = new window.WatchPartyChatManager({
      firebase,
      roomId,
      userId: authUser.localId,
      getDisplayName: () => displayName,
      onMessages: (messages) => ui.setMessages(messages),
      onError: (error) => ui.setSyncStatus(error.message)
    });
    chat.start();
  }

  function startSyncWhenReady() {
    clearInterval(detectTimer);
    const attempt = () => {
      selectAdapter();
      if (!adapter?.canControl()) return;
      sync?.stop();
      sync = new window.WatchPartyPlaybackSync({
        adapter,
        firebase,
        roomId,
        userId: authUser.localId,
        onStatus: (status) => ui.setSyncStatus(status)
      });
      sync.start();
      clearInterval(detectTimer);
    };
    attempt();
    detectTimer = setInterval(attempt, 2500);
  }

  async function startCall() {
    if (!roomId) {
      ui.setCallStatus("Join a room before starting a call.");
      return;
    }
    if (!webrtc) {
      webrtc = new window.WatchPartyWebRTCManager({
        firebase,
        roomId,
        userId: authUser.localId,
        getDisplayName: () => displayName,
        ui
      });
    }
    await webrtc.start();
  }

  async function leaveRoom() {
    if (!roomId) return;
    sync?.stop();
    chat?.stop();
    if (webrtc) {
      await webrtc.end();
      webrtc = null;
    }
    await firebase.leaveRoom(roomId, displayName);
    ui.setRoomStatus("No room joined");
    ui.setSyncStatus("idle");
    ui.setMessages([]);
    ui.setVisible(false);
    roomId = null;
  }

  function watchNavigation() {
    setInterval(() => {
      if (location.href === lastHref) return;
      lastHref = location.href;
      selectAdapter();
      if (roomId) startSyncWhenReady();
    }, 1000);
  }

  ext.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    (async () => {
      if (message?.type === "WATCHPARTY_JOIN_ROOM") await joinRoom(message.roomId, message.displayName);
      if (message?.type === "WATCHPARTY_LEAVE_ROOM") await leaveRoom();
      if (message?.type === "WATCHPARTY_SEND_CHAT") await chat?.send(message.text);
      if (message?.type === "WATCHPARTY_START_CALL") await startCall();
      if (message?.type === "WATCHPARTY_END_CALL") { await webrtc?.end(); webrtc = null; }
      if (message?.type === "WATCHPARTY_TOGGLE_MUTE") webrtc?.toggleMute();
      if (message?.type === "WATCHPARTY_TOGGLE_CAMERA") webrtc?.toggleCamera();
      if (message?.type === "WATCHPARTY_STATUS") {
        sendResponse({
          roomId,
          platform: adapter?.name || "Unsupported",
          canControl: Boolean(adapter?.canControl()),
          displayName,
          callActive: Boolean(webrtc && webrtc.pc),
          micMuted: webrtc ? webrtc.micMuted : false,
          cameraOff: webrtc ? webrtc.cameraOff : false
        });
        return;
      }
      sendResponse({ ok: true });
    })().catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  });

  boot().catch((error) => console.error("WatchParty boot failed", error));
})();
