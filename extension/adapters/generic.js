(() => {
  class GenericAdapter extends window.WatchPartyBaseAdapter {
    constructor() { super("Generic HTML5", []); }
    matchesLocation() { return Boolean(this.getVideo()); }
  }
  window.WatchPartyAdapters.push(new GenericAdapter());
})();
