(() => {
  class PlaybackSync {
    constructor({ adapter, firebase, roomId, userId, onStatus }) {
      this.adapter = adapter;
      this.firebase = firebase;
      this.roomId = roomId;
      this.userId = userId;
      this.onStatus = onStatus || (() => {});
      this.applyingRemoteAction = false;
      this.lastPublishedAt = 0;
      this.lastRemoteActionId = null;
      this.unsubState = null;
      this.driftTimer = null;
      this.boundHandlers = [];
    }

    start() {
      this.stop();
      const video = this.adapter.getVideo();
      if (!video) {
        this.onStatus("No safe video element found yet.");
        return false;
      }

      [["play", "playing"], ["playing", "playing"], ["pause", "paused"], ["seeked", "seeked"]].forEach(([eventName, status]) => {
        const handler = () => this.publish(status);
        video.addEventListener(eventName, handler, true);
        this.boundHandlers.push([video, eventName, handler]);
      });

      this.unsubState = null;
      this.firebase.onValue(`rooms/${this.roomId}/state`, (state) => this.applyRemoteState(state), (error) => {
        this.onStatus(error.message);
      }).then((unsub) => { this.unsubState = unsub; });

      this.driftTimer = setInterval(() => this.correctDrift(), 4500);
      this.onStatus(`Sync ready on ${this.adapter.name}.`);
      return true;
    }

    stop() {
      this.boundHandlers.forEach(([video, eventName, handler]) => {
        if (video) video.removeEventListener(eventName, handler, true);
      });
      this.boundHandlers = [];
      this.unsubState?.();
      this.unsubState = null;
      clearInterval(this.driftTimer);
      this.driftTimer = null;
      this.applyingRemoteAction = false;
    }

    async publish(status) {
      if (this.applyingRemoteAction) return;
      const now = Date.now();
      if (now - this.lastPublishedAt < 650) return;
      this.lastPublishedAt = now;

      const state = {
        status: status === "paused" ? "paused" : "playing",
        time: this.adapter.getTime(),
        updatedAt: now,
        updatedBy: this.userId,
        actionId: this.firebase.createActionId("playback"),
        platform: this.adapter.name,
        titleOrVideoId: this.adapter.getTitleOrVideoId()
      };

      if (status === "seeked") {
        state.status = this.adapter.isPlaying() ? "playing" : "paused";
      }

      await this.firebase.set(`rooms/${this.roomId}/state`, state).catch((error) => {
        this.onStatus(error.message);
      });
    }

    async applyRemoteState(state) {
      if (!state || state.updatedBy === this.userId || state.actionId === this.lastRemoteActionId) return;
      const video = this.adapter.getVideo();
      if (!video) return;

      this.lastRemoteActionId = state.actionId;
      this.applyingRemoteAction = true;
      try {
        const remoteTime = Number(state.time || 0);
        if (Number.isFinite(remoteTime) && Math.abs(video.currentTime - remoteTime) > 0.75) {
          this.adapter.seek(remoteTime);
        }
        if (state.status === "playing" && !this.adapter.isPlaying()) {
          await this.adapter.play();
        } else if (state.status === "paused" && this.adapter.isPlaying()) {
          this.adapter.pause();
        }
        this.onStatus(`Applied ${state.status} from room.`);
      } catch (error) {
        this.onStatus(`Could not control player safely: ${error.message}`);
      } finally {
        setTimeout(() => { this.applyingRemoteAction = false; }, 500);
      }
    }

    correctDrift() {
      this.firebase.get(`rooms/${this.roomId}/state`).then((state) => {
        if (!state || state.updatedBy === this.userId || state.status !== "playing") return;
        const localTime = this.adapter.getTime();
        const remoteTime = Number(state.time || 0) + Math.max(0, Date.now() - Number(state.updatedAt || Date.now())) / 1000;
        if (Math.abs(localTime - remoteTime) > 1.5) {
          this.applyingRemoteAction = true;
          this.adapter.seek(remoteTime);
          this.onStatus("Corrected playback drift.");
          setTimeout(() => { this.applyingRemoteAction = false; }, 500);
        }
      }).catch(() => undefined);
    }
  }

  window.WatchPartyPlaybackSync = PlaybackSync;
})();
