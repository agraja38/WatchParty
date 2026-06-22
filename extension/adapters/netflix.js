(() => {
  class NetflixAdapter extends window.WatchPartyBaseAdapter {
    constructor() { super("Netflix", ["netflix.com"]); }
    getTitleOrVideoId() { return document.title || "Netflix title"; }
  }
  window.WatchPartyAdapters.push(new NetflixAdapter());
})();
