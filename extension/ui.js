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
      if (stream) this.localVideo.play().catch(() => undefined);
    }

    setRemoteStream(stream) {
      if (this.remoteVideo) this.remoteVideo.srcObject = stream;
      if (stream) this.remoteVideo.play().catch(() => undefined);
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
        width: min(360px, calc(100vw - 28px));
        color: #16202a;
        font-family: Georgia, "Times New Roman", serif;
      }
      #watchparty-overlay * { box-sizing: border-box; }
      #watchparty-overlay .wp-overlay-card {
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.55);
        border-radius: 22px;
        background: #fff8eb;
        box-shadow: 0 24px 70px rgba(0, 0, 0, 0.32);
      }
      #watchparty-overlay .wp-overlay-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 12px 13px;
        color: #fff8eb;
        background: linear-gradient(135deg, #101820, #1f3a3d 72%, #4d3c13);
      }
      #watchparty-overlay .wp-overlay-head h3 { margin: 0; font-size: 20px; letter-spacing: -0.03em; }
      #watchparty-overlay .wp-overlay-meta { margin: 3px 0 0; color: rgba(255, 248, 235, 0.78); font: 11px/1.3 Verdana, sans-serif; }
      #watchparty-overlay .wp-overlay-body { padding: 12px; }
      #watchparty-overlay .wp-overlay-minimized .wp-overlay-body { display: none; }
      #watchparty-overlay .wp-sync-status {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-bottom: 10px;
        font: 12px/1.35 Verdana, sans-serif;
      }
      #watchparty-overlay .wp-sync-status span,
      #watchparty-overlay .wp-overlay-chat,
      #watchparty-overlay input {
        border: 1px solid rgba(22, 32, 42, 0.16);
        border-radius: 14px;
        background: #fffdf7;
      }
      #watchparty-overlay .wp-sync-status span { padding: 8px; }
      #watchparty-overlay .wp-overlay-chat {
        height: 128px;
        overflow: auto;
        padding: 8px;
        font: 12px/1.4 Verdana, sans-serif;
      }
      #watchparty-overlay .chat-message { margin-bottom: 8px; word-break: break-word; }
      #watchparty-overlay .chat-message strong { color: #0f6b63; }
      #watchparty-overlay .wp-video-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin: 10px 0;
      }
      #watchparty-overlay .wp-video-grid video {
        width: 100%;
        min-height: 88px;
        border-radius: 14px;
        background: #101820;
        object-fit: cover;
      }
      #watchparty-overlay .wp-overlay-controls,
      #watchparty-overlay .wp-overlay-compose {
        display: flex;
        gap: 7px;
        margin-top: 8px;
        flex-wrap: wrap;
      }
      #watchparty-overlay input {
        flex: 1;
        min-width: 0;
        padding: 10px 12px;
        color: #16202a;
        font: 12px/1.2 Verdana, sans-serif;
      }
      #watchparty-overlay button {
        border: 0;
        border-radius: 999px;
        padding: 10px 13px;
        color: #1a2027;
        background: #ffb703;
        cursor: pointer;
        font: 700 12px/1 Verdana, sans-serif;
      }
      #watchparty-overlay button.secondary,
      #watchparty-overlay .wp-mini-button { background: #dce9e7; }
      #watchparty-overlay .wp-overlay-controls button { flex: 1 1 42%; }
      #watchparty-overlay .hint {
        margin: 10px 0 0;
        color: #6b6f76;
        font: 12px/1.45 Verdana, sans-serif;
      }
      @media (max-width: 430px) {
        #watchparty-overlay { left: 10px; right: 10px; width: auto; }
      }
    `;
    document.documentElement.appendChild(style);
  }

  window.WatchPartyOverlayUI = OverlayUI;
})();
