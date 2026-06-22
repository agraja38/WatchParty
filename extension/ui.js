(() => {
  class OverlayUI {
    constructor({ onSendChat, onStartCall, onEndCall, onToggleMute, onToggleCamera }) {
      this.handlers = { onSendChat, onStartCall, onEndCall, onToggleMute, onToggleCamera };
      this.root = null;
      this.messagesEl = null;
      this.localVideo = null;
      this.remoteVideo = null;
      this.state = { minimized: false };
      this.render();
    }

    render() {
      if (document.getElementById("watchparty-overlay")) {
        this.root = document.getElementById("watchparty-overlay");
        return;
      }

      injectOverlayStyles();
      this.root = document.createElement("div");
      this.root.id = "watchparty-overlay";
      this.root.innerHTML = `
        <section class="wp-overlay-card">
          <header class="wp-overlay-head">
            <div>
              <h3>WatchParty</h3>
              <p class="wp-overlay-meta" data-role="room-status">No room joined</p>
            </div>
            <button class="wp-mini-button" data-action="minimize" title="Minimize">-</button>
          </header>
          <div class="wp-overlay-body">
            <div class="wp-sync-status">
              <span data-role="platform">Platform: detecting</span>
              <span data-role="sync">Sync: idle</span>
            </div>
            <div class="wp-overlay-chat" data-role="chat"></div>
            <form class="wp-overlay-compose" data-role="chat-form">
              <input data-role="chat-input" maxlength="500" placeholder="Message the room...">
              <button type="submit">Send</button>
            </form>
            <div class="wp-video-grid">
              <video data-role="local-video" muted playsinline></video>
              <video data-role="remote-video" playsinline autoplay></video>
            </div>
            <div class="wp-overlay-controls">
              <button data-action="start-call">Start call</button>
              <button data-action="end-call" class="secondary">End call</button>
              <button data-action="mute" class="secondary">Mute mic</button>
              <button data-action="camera" class="secondary">Camera off</button>
            </div>
            <p class="hint" data-role="call-status">Call idle.</p>
          </div>
        </section>`;
      document.documentElement.appendChild(this.root);
      this.messagesEl = this.root.querySelector('[data-role="chat"]');
      this.localVideo = this.root.querySelector('[data-role="local-video"]');
      this.remoteVideo = this.root.querySelector('[data-role="remote-video"]');

      this.root.querySelector('[data-role="chat-form"]').addEventListener("submit", (event) => {
        event.preventDefault();
        const input = this.root.querySelector('[data-role="chat-input"]');
        this.handlers.onSendChat?.(input.value);
        input.value = "";
      });
      this.root.querySelector('[data-action="minimize"]').addEventListener("click", () => this.toggleMinimize());
      this.root.querySelector('[data-action="start-call"]').addEventListener("click", () => this.handlers.onStartCall?.());
      this.root.querySelector('[data-action="end-call"]').addEventListener("click", () => this.handlers.onEndCall?.());
      this.root.querySelector('[data-action="mute"]').addEventListener("click", () => this.handlers.onToggleMute?.());
      this.root.querySelector('[data-action="camera"]').addEventListener("click", () => this.handlers.onToggleCamera?.());
    }

    toggleMinimize() {
      this.state.minimized = !this.state.minimized;
      this.root.querySelector(".wp-overlay-card").classList.toggle("wp-overlay-minimized", this.state.minimized);
      this.root.querySelector('[data-action="minimize"]').textContent = this.state.minimized ? "+" : "-";
    }

    setVisible(visible) {
      if (this.root) this.root.style.display = visible ? "block" : "none";
    }

    setCallState({ active, micMuted, cameraOff }) {
      const card = this.root?.querySelector(".wp-overlay-card");
      if (card) {
        card.classList.toggle("wp-call-active", active);
      }
      
      const muteBtn = this.root?.querySelector('[data-action="mute"]');
      if (muteBtn) {
        muteBtn.textContent = micMuted ? "Unmute mic" : "Mute mic";
        muteBtn.classList.toggle("warning", micMuted);
      }

      const camBtn = this.root?.querySelector('[data-action="camera"]');
      if (camBtn) {
        camBtn.textContent = cameraOff ? "Camera on" : "Camera off";
        camBtn.classList.toggle("warning", cameraOff);
      }
    }

    setRoomStatus(text) { this.setText("room-status", text); }
    setPlatform(text) { this.setText("platform", `Platform: ${text}`); }
    setSyncStatus(text) { this.setText("sync", `Sync: ${text}`); }
    setCallStatus(text) { this.setText("call-status", text); }

    setText(role, text) {
      const element = this.root?.querySelector(`[data-role="${role}"]`);
      if (element) element.textContent = text;
    }

    setMessages(messages) {
      if (!this.messagesEl) return;
      this.messagesEl.innerHTML = messages.map((message) => `
        <div class="chat-message">
          <strong>${escapeHtml(message.displayName || "Guest")}</strong>
          <span>${escapeHtml(message.text || "")}</span>
        </div>`).join("");
      this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    }

    setLocalStream(stream) {
      if (this.localVideo) this.localVideo.srcObject = stream;
      if (stream) {
        this.localVideo.style.display = "block";
        this.localVideo.play().catch(() => undefined);
      } else {
        if (this.localVideo) this.localVideo.style.display = "none";
      }
      this.updateVideoGridVisibility();
    }

    setRemoteStream(stream) {
      if (this.remoteVideo) this.remoteVideo.srcObject = stream;
      if (stream && stream.getTracks().length > 0) {
        this.remoteVideo.style.display = "block";
        this.remoteVideo.play().catch(() => undefined);
      } else {
        if (this.remoteVideo) this.remoteVideo.style.display = "none";
      }
      this.updateVideoGridVisibility();
    }

    updateVideoGridVisibility() {
      const grid = this.root?.querySelector(".wp-video-grid");
      if (grid) {
        const hasLocal = this.localVideo && this.localVideo.srcObject;
        const hasRemote = this.remoteVideo && this.remoteVideo.srcObject && this.remoteVideo.srcObject.getTracks().length > 0;
        grid.style.display = (hasLocal || hasRemote) ? "grid" : "none";
      }
    }
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

  function injectOverlayStyles() {
    if (document.getElementById("watchparty-overlay-styles")) return;
    const style = document.createElement("style");
    style.id = "watchparty-overlay-styles";
    style.textContent = `
      #watchparty-overlay {
        all: initial;
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 2147483647;
        width: min(350px, calc(100vw - 28px));
        color: #f3f4f6;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      }
      #watchparty-overlay * { box-sizing: border-box; }
      #watchparty-overlay .wp-overlay-card {
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 16px;
        background: rgba(15, 23, 42, 0.85);
        backdrop-filter: blur(12px);
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
      }
      #watchparty-overlay .wp-overlay-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 12px 14px;
        color: #ffffff;
        background: linear-gradient(135deg, #0f172a, #1e1b4b);
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }
      #watchparty-overlay .wp-overlay-head h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 800;
        letter-spacing: -0.02em;
        background: linear-gradient(to right, #a78bfa, #22d3ee);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      #watchparty-overlay .wp-overlay-meta {
        margin: 2px 0 0;
        color: #9ca3af;
        font-size: 10px;
        font-weight: 500;
      }
      #watchparty-overlay .wp-overlay-body {
        padding: 12px;
      }
      #watchparty-overlay .wp-overlay-minimized .wp-overlay-body {
        display: none;
      }
      #watchparty-overlay .wp-sync-status {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-bottom: 10px;
        font-size: 11px;
      }
      #watchparty-overlay .wp-sync-status span,
      #watchparty-overlay .wp-overlay-chat,
      #watchparty-overlay input {
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        background: rgba(17, 24, 39, 0.6);
        color: #f3f4f6;
      }
      #watchparty-overlay .wp-sync-status span {
        padding: 6px 8px;
        font-weight: 600;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      #watchparty-overlay .wp-overlay-chat {
        height: 120px;
        overflow-y: auto;
        padding: 8px;
        font-size: 12px;
        line-height: 1.4;
      }
      #watchparty-overlay .chat-message {
        margin-bottom: 6px;
        word-break: break-word;
      }
      #watchparty-overlay .chat-message strong {
        color: #22d3ee;
      }
      #watchparty-overlay .chat-message span {
        color: #e5e7eb;
      }
      #watchparty-overlay .wp-video-grid {
        display: none;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin: 10px 0;
      }
      #watchparty-overlay .wp-video-grid video {
        width: 100%;
        min-height: 80px;
        border-radius: 10px;
        background: #000000;
        object-fit: cover;
      }
      #watchparty-overlay .wp-overlay-controls,
      #watchparty-overlay .wp-overlay-compose {
        display: flex;
        gap: 6px;
        margin-top: 8px;
        flex-wrap: wrap;
      }
      #watchparty-overlay input {
        flex: 1;
        min-width: 0;
        padding: 8px 10px;
        font-size: 12px;
      }
      #watchparty-overlay input:focus {
        border-color: #8b5cf6;
        outline: none;
      }
      #watchparty-overlay button {
        border: 0;
        border-radius: 999px;
        padding: 8px 12px;
        color: #ffffff;
        background: linear-gradient(135deg, #8b5cf6, #06b6d4);
        cursor: pointer;
        font-size: 11px;
        font-weight: 700;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      #watchparty-overlay button:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(6, 182, 212, 0.35);
      }
      #watchparty-overlay button:active {
        transform: translateY(0);
      }
      #watchparty-overlay button.secondary,
      #watchparty-overlay .wp-mini-button {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: #f3f4f6;
      }
      #watchparty-overlay button.secondary:hover,
      #watchparty-overlay .wp-mini-button:hover {
        background: rgba(255, 255, 255, 0.15);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      }
      #watchparty-overlay button.warning {
        background: linear-gradient(135deg, #f59e0b, #d97706) !important;
      }
      #watchparty-overlay button.warning:hover {
        box-shadow: 0 4px 12px rgba(245, 158, 11, 0.35);
      }
      #watchparty-overlay .wp-mini-button {
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 12px;
        font-family: monospace;
      }
      #watchparty-overlay .wp-overlay-controls button {
        flex: 1 1 calc(50% - 3px);
      }
      #watchparty-overlay .hint {
        margin: 8px 0 0;
        color: #9ca3af;
        font-size: 11px;
        line-height: 1.3;
      }

      /* Call state-based CSS toggles */
      #watchparty-overlay .wp-overlay-card:not(.wp-call-active) [data-action="end-call"],
      #watchparty-overlay .wp-overlay-card:not(.wp-call-active) [data-action="mute"],
      #watchparty-overlay .wp-overlay-card:not(.wp-call-active) [data-action="camera"] {
        display: none !important;
      }
      #watchparty-overlay .wp-overlay-card.wp-call-active [data-action="start-call"] {
        display: none !important;
      }

      @media (max-width: 430px) {
        #watchparty-overlay { left: 10px; right: 10px; width: auto; }
      }
    `;
    document.documentElement.appendChild(style);
  }

  window.WatchPartyOverlayUI = OverlayUI;
})();
