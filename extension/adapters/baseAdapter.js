(() => {
  class BaseAdapter {
    constructor(name, hostPatterns = []) {
      this.name = name;
      this.hostPatterns = hostPatterns;
      this.message = "";
    }

    matchesLocation(location = window.location) {
      const host = location.hostname.toLowerCase();
      return this.hostPatterns.some((pattern) => host === pattern || host.endsWith(`.${pattern}`));
    }

    getVideo() {
      const videos = [...document.querySelectorAll("video")]
        .filter((video) => video.readyState >= 1 && video.duration && Number.isFinite(video.duration));
      return videos.sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight))[0] || null;
    }

    async play() {
      const video = this.getVideo();
      if (!video) throw new Error(`${this.name}: no controllable HTML5 video element found.`);
      await video.play();
    }

    pause() {
      const video = this.getVideo();
      if (!video) throw new Error(`${this.name}: no controllable HTML5 video element found.`);
      video.pause();
    }

    seek(time) {
      const video = this.getVideo();
      if (!video) throw new Error(`${this.name}: no controllable HTML5 video element found.`);
      if (Number.isFinite(time)) video.currentTime = Math.max(0, Math.min(time, video.duration || time));
    }

    getTime() {
      return this.getVideo()?.currentTime || 0;
    }

    getDuration() {
      return this.getVideo()?.duration || 0;
    }

    isPlaying() {
      const video = this.getVideo();
      return Boolean(video && !video.paused && !video.ended);
    }

    getTitleOrVideoId() {
      return document.title || location.href;
    }

    canControl() {
      return Boolean(this.getVideo());
    }
  }

  window.WatchPartyAdapters = window.WatchPartyAdapters || [];
  window.WatchPartyBaseAdapter = BaseAdapter;
})();
