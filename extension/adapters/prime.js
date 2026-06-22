(() => {
  class PrimeAdapter extends window.WatchPartyBaseAdapter {
    constructor() { super("Prime Video", ["primevideo.com", "amazon.com"]); }
    getTitleOrVideoId() { return document.title || "Prime Video title"; }
  }
  window.WatchPartyAdapters.push(new PrimeAdapter());
})();
