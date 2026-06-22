(() => {
  class MaxAdapter extends window.WatchPartyBaseAdapter {
    constructor() { super("Max/HBO", ["max.com", "hbomax.com"]); }
    getTitleOrVideoId() { return document.title || "Max/HBO title"; }
  }
  window.WatchPartyAdapters.push(new MaxAdapter());
})();
