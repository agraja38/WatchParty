(() => {
  const CONFIG = {
    apiKey: "AIzaSyBJjaiKbiNcvcf6yH9_VcWhq_NKkYis8dQ",
    authDomain: "watchparty-8c5f9.firebaseapp.com",
    databaseURL: "https://watchparty-8c5f9-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "watchparty-8c5f9",
    storageBucket: "watchparty-8c5f9.firebasestorage.app",
    messagingSenderId: "263561927466",
    appId: "1:263561927466:web:68fb491e31bbb8f81bdc53",
    measurementId: "G-7Z0K51QJ0C"
  };

  const AUTH_KEY = "watchpartyAuth";
  const ROOM_KEY = "watchpartyCurrentRoom";
  const DISPLAY_NAME_KEY = "watchpartyDisplayName";

  const storage = {
    async get(keys) {
      if (!globalThis.chrome?.storage?.local) return {};
      return chrome.storage.local.get(keys);
    },
    async set(value) {
      if (!globalThis.chrome?.storage?.local) return;
      await chrome.storage.local.set(value);
    },
    async remove(keys) {
      if (!globalThis.chrome?.storage?.local) return;
      await chrome.storage.local.remove(keys);
    }
  };

  function cleanPath(path) {
    return String(path || "").replace(/^\/+|\/+$/g, "");
  }

  function encodePath(path) {
    return cleanPath(path)
      .split("/")
      .filter(Boolean)
      .map(encodeURIComponent)
      .join("/");
  }

  function createActionId(prefix = "act") {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function createRoomCode() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    crypto.getRandomValues(new Uint8Array(6)).forEach((value) => {
      code += alphabet[value % alphabet.length];
    });
    return code;
  }

  async function refreshIdToken(cached) {
    const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${CONFIG.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(cached.refreshToken)}`
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Firebase token refresh failed: ${text}`);
    }
    const data = await response.json();
    const authUser = {
      idToken: data.id_token,
      refreshToken: data.refresh_token || cached.refreshToken,
      localId: data.user_id || cached.localId,
      expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000
    };
    await storage.set({ [AUTH_KEY]: authUser });
    return authUser;
  }

  async function signInAnonymously() {
    const cached = (await storage.get(AUTH_KEY))[AUTH_KEY];
    if (cached?.idToken && cached?.localId && cached?.expiresAt > Date.now() + 60000) {
      return cached;
    }
    if (cached?.refreshToken) {
      try {
        return await refreshIdToken(cached);
      } catch (_) {
        // Fall through to a new anonymous sign-up if refresh fails.
      }
    }

    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${CONFIG.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnSecureToken: true })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Firebase anonymous auth failed: ${text}`);
    }

    const data = await response.json();
    const authUser = {
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      localId: data.localId,
      expiresAt: Date.now() + Number(data.expiresIn || 3600) * 1000
    };
    await storage.set({ [AUTH_KEY]: authUser });
    return authUser;
  }

  async function authQuery() {
    const user = await signInAnonymously();
    return `auth=${encodeURIComponent(user.idToken)}`;
  }

  async function dbUrl(path, query = "") {
    const auth = await authQuery();
    const suffix = query ? `${auth}&${query}` : auth;
    return `${CONFIG.databaseURL}/${encodePath(path)}.json?${suffix}`;
  }

  async function request(path, options = {}, query = "") {
    const url = await dbUrl(path, query);
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Firebase database request failed for ${path}: ${text}`);
    }
    if (response.status === 204) return null;
    return response.json();
  }

  function setNestedValue(target, path, value) {
    const parts = String(path || "/").split("/").filter(Boolean);
    if (!parts.length) return value;
    const root = target && typeof target === "object" ? target : {};
    let cursor = root;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const key = parts[i];
      if (!cursor[key] || typeof cursor[key] !== "object") cursor[key] = {};
      cursor = cursor[key];
    }
    const last = parts[parts.length - 1];
    if (value === null) delete cursor[last];
    else cursor[last] = value;
    return root;
  }

  async function onValue(path, callback, onError) {
    const user = await signInAnonymously();
    const url = `${CONFIG.databaseURL}/${encodePath(path)}.json?auth=${encodeURIComponent(user.idToken)}`;
    let cache = undefined;
    try {
      const initial = await fetch(url, { headers: { Accept: "application/json" } });
      if (initial.ok) {
        cache = await initial.json();
        if (cache !== null) callback(cache);
      }
    } catch (error) {
      onError?.(error);
    }
    const source = new EventSource(url);

    source.addEventListener("put", (event) => {
      const data = JSON.parse(event.data);
      cache = setNestedValue(cache, data.path, data.data);
      callback(cache);
    });
    source.addEventListener("patch", (event) => {
      const data = JSON.parse(event.data);
      const patch = data.data || {};
      Object.entries(patch).forEach(([key, value]) => {
        cache = setNestedValue(cache, `${data.path}/${key}`, value);
      });
      callback(cache);
    });
    source.addEventListener("cancel", (event) => {
      onError?.(new Error(`Firebase stream cancelled: ${event.data || "unknown"}`));
    });
    source.onerror = () => {
      onError?.(new Error(`Firebase stream interrupted for ${path}`));
    };

    return () => source.close();
  }

  async function setUserPresence(roomId, displayName, online) {
    const user = await signInAnonymously();
    await request(`rooms/${roomId}/users/${user.localId}`, {
      method: "PATCH",
      body: JSON.stringify({
        displayName: displayName || "Guest",
        joinedAt: Date.now(),
        online: Boolean(online)
      })
    });
    return user;
  }

  async function ensureRoom(roomId, displayName) {
    const user = await setUserPresence(roomId, displayName, true);
    await request(`rooms/${roomId}/meta`, {
      method: "PATCH",
      body: JSON.stringify({
        createdAt: Date.now(),
        updatedAt: Date.now(),
        schemaVersion: 1
      })
    });
    await storage.set({ [ROOM_KEY]: roomId, [DISPLAY_NAME_KEY]: displayName || "Guest" });
    return { roomId, userId: user.localId };
  }

  async function leaveRoom(roomId, displayName) {
    if (!roomId) return;
    await setUserPresence(roomId, displayName, false).catch(() => undefined);
    await storage.remove(ROOM_KEY);
  }

  window.WatchPartyFirebase = {
    CONFIG,
    ROOM_KEY,
    DISPLAY_NAME_KEY,
    storage,
    signInAnonymously,
    get: (path, query) => request(path, { method: "GET" }, query),
    set: (path, value) => request(path, { method: "PUT", body: JSON.stringify(value) }),
    update: (path, value) => request(path, { method: "PATCH", body: JSON.stringify(value) }),
    remove: (path) => request(path, { method: "DELETE" }),
    push: async (path, value) => request(path, { method: "POST", body: JSON.stringify(value) }),
    onValue,
    createActionId,
    createRoomCode,
    ensureRoom,
    leaveRoom
  };
})();
