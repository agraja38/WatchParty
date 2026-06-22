(() => {
  class ChatManager {
    constructor({ firebase, roomId, userId, getDisplayName, onMessages, onError }) {
      this.firebase = firebase;
      this.roomId = roomId;
      this.userId = userId;
      this.getDisplayName = getDisplayName || (() => "Guest");
      this.onMessages = onMessages || (() => {});
      this.onError = onError || (() => {});
      this.unsub = null;
    }

    start() {
      this.stop();
      this.firebase.onValue(`rooms/${this.roomId}/chat`, (messagesById) => {
        const messages = Object.entries(messagesById || {})
          .map(([id, value]) => ({ id, ...value }))
          .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
          .slice(-80);
        this.onMessages(messages);
      }, this.onError).then((unsub) => { this.unsub = unsub; });
    }

    stop() {
      this.unsub?.();
      this.unsub = null;
    }

    async send(text) {
      const clean = String(text || "").trim();
      if (!clean) return;
      await this.firebase.push(`rooms/${this.roomId}/chat`, {
        userId: this.userId,
        displayName: this.getDisplayName() || "Guest",
        text: clean.slice(0, 500),
        createdAt: Date.now()
      });
      this.trimOldMessages().catch(() => undefined);
    }

    async trimOldMessages(limit = 100) {
      const messages = await this.firebase.get(`rooms/${this.roomId}/chat`);
      const entries = Object.entries(messages || {}).sort((a, b) => (a[1].createdAt || 0) - (b[1].createdAt || 0));
      const oldEntries = entries.slice(0, Math.max(0, entries.length - limit));
      await Promise.all(oldEntries.map(([id]) => this.firebase.remove(`rooms/${this.roomId}/chat/${id}`)));
    }
  }

  window.WatchPartyChatManager = ChatManager;
})();
