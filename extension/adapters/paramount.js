(() => {
  class ParamountAdapter extends window.WatchPartyBaseAdapter {
    constructor() { super("Paramount+", ["paramountplus.com"]); }
    getTitleOrVideoId() { return document.title || "Paramount+ title"; }
  }
  window.WatchPartyAdapters.push(new ParamountAdapter());
})();
