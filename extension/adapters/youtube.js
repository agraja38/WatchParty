(() => {
  class YouTubeAdapter extends window.WatchPartyBaseAdapter {
    constructor() { super("YouTube", ["youtube.com", "youtu.be"]); }

    getVideo() {
      return document.querySelector("video.html5-main-video") || super.getVideo();
    }

    getTitleOrVideoId() {
      const params = new URLSearchParams(location.search);
      const id = params.get("v") || location.pathname.replace(/^\//, "");
      const title = document.querySelector("h1.ytd-watch-metadata yt-formatted-string")?.textContent?.trim()
        || document.querySelector("h1.title")?.textContent?.trim()
        || document.title.replace(/ - YouTube$/, "").trim();
      return title ? `${title} (${id})` : id || document.title;
    }
  }
  window.WatchPartyAdapters.push(new YouTubeAdapter());
})();
