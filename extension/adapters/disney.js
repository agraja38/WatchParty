(() => {
  class DisneyAdapter extends window.WatchPartyBaseAdapter {
    constructor() { super("Disney+", ["disneyplus.com"]); }
    getTitleOrVideoId() { return document.title || "Disney+ title"; }
  }
  window.WatchPartyAdapters.push(new DisneyAdapter());
})();
