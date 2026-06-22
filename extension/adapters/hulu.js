(() => {
  class HuluAdapter extends window.WatchPartyBaseAdapter {
    constructor() { super("Hulu", ["hulu.com"]); }
    getTitleOrVideoId() { return document.title || "Hulu title"; }
  }
  window.WatchPartyAdapters.push(new HuluAdapter());
})();
