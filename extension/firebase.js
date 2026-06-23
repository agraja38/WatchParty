(() => {
  const ext = globalThis.browser || globalThis.chrome;
  const DEBUG = true;
  const CONFIG = {
    apiKey: "AIzaSyBJjaiKbiNcvcf6yH9_VcWhq_NKkYis8dQ",
    authDomain: "watchparty-8c5f9.firebaseapp.com",
    databaseURL: "https://watchparty-8c5f9-default-rtdb.firebaseio.com",
    projectId: "watchparty-8c5f9",
    storageBucket: "watchparty-8c5f9.firebasestorage.app",
    messagingSenderId: "263561927466",
    appId: "1:263561927466:web:68fb491e31bbb8f81bdc53",
    measurementId: "G-7Z0K51QJ0C"
  };
  const DATABASE_URL_FALLBACKS = [
    CONFIG.databaseURL,
    "https://watchparty-8c5f9-default-rtdb.asia-southeast1.firebasedatabase.app"
  ];
  let activeDatabaseURL = CONFIG.databaseURL;

  const AUTH_KEY = "watchpartyAuth";
  const ROOM_KEY = "watchpartyCurrentRoom";
  const DISPLAY_NAME_KEY = "watchpartyDisplayName";

  function debugLog(...args) {
    if (DEBUG) console.log(...args);
  }

  function debugError(...args) {
    if (DEBUG) console.error(...args);
  }

  function createFirebaseError(input) {
    const { code, message, details, source, ...extra } = input || {};
    const error = new Error(message || "Firebase operation failed");
    error.code = code || "firebase/unknown";
    error.details = details || "";
    error.source = source || "unknown";
    Object.assign(error, extra);
    return error;
  }

  function normalizeAuthCode(raw) {
    const value = String(raw || "").trim();
    if (value === "OPERATION_NOT_ALLOWED") return "auth/operation-not-allowed";
    if (value === "CONFIGURATION_NOT_FOUND") return "auth/configuration-not-found";
    if (value === "NETWORK_REQUEST_FAILED") return "auth/network-request-failed";
    if (value) return `auth/${value.toLowerCase().replace(/_/g, "-")}`;
    return "auth/unknown";
  }

  function parseJsonSafe(text) {
    try { return JSON.parse(text); } catch { return null; }
  }

  function parseAuthError(text, source) {
    const parsed = parseJsonSafe(text);
    const message = parsed?.error?.message || parsed?.error || text || "Authentication failed";
    const code = normalizeAuthCode(parsed?.error?.message);
    return createFirebaseError({
      code,
      source,
      message: `Firebase Auth error: ${code}`,
      details: message
    });
  }

  function parseDatabaseError(text, source, path) {
    const parsed = parseJsonSafe(text);
    const message = parsed?.error || parsed?.error?.message || text || "Database request failed";
    let code = "database/unknown";
    if (/permission denied/i.test(message)) code = "database/permission-denied";
    if (/database lives in a different region|correctUrl/i.test(text)) code = "database/incorrect-url";
    if (/auth/i.test(message) && /expired|invalid/i.test(message)) code = "database/auth-invalid";
    return createFirebaseError({
      code,
      source,
      message: `Database error: ${code} (${path})`,
      details: message,
      correctUrl: parsed?.correctUrl
    });
  }

  function parseNetworkError(error, source) {
    return createFirebaseError({
      code: "firebase/network-or-csp",
      source,
      message: "Firebase network/CSP error. Check extension console.",
      details: error?.message || String(error)
    });
  }

  const storage = {
    async get(keys) {
      if (!ext?.storage?.local) return {};
      return ext.storage.local.get(keys);
    },
    async set(value) {
      if (!ext?.storage?.local) return;
      await ext.storage.local.set(value);
    },
    async remove(keys) {
      if (!ext?.storage?.local) return;
      await ext.storage.local.remove(keys);
    }
  };

  debugLog("Firebase app initializing");
  debugLog("Firebase app initialized", { projectId: CONFIG.projectId });
  debugLog("Auth object created");
  debugLog("Database object created");
  debugLog("Database URL being used", activeDatabaseURL);

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
    debugLog("Anonymous sign-in starting (refresh token)");
    let response;
    try {
      response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${CONFIG.apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(cached.refreshToken)}`
      });
    } catch (error) {
      const parsedError = parseNetworkError(error, "securetoken.googleapis.com");
      debugError("Anonymous sign-in failed with full error code and message", parsedError.code, parsedError.details);
      throw parsedError;
    }
    if (!response.ok) {
      const text = await response.text();
      throw parseAuthError(text, "securetoken.googleapis.com");
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
    if (!CONFIG.databaseURL) {
      throw createFirebaseError({
        code: "app/missing-database-url",
        source: "config",
        message: "Realtime Database URL is missing or incorrect.",
        details: "databaseURL is empty"
      });
    }
    const cached = (await storage.get(AUTH_KEY))[AUTH_KEY];
    if (cached?.idToken && cached?.localId && cached?.expiresAt > Date.now() + 60000) {
      debugLog("Anonymous sign-in success with uid", cached.localId);
      return cached;
    }
    if (cached?.refreshToken) {
      try {
        const refreshed = await refreshIdToken(cached);
        debugLog("Anonymous sign-in success with uid", refreshed.localId);
        return refreshed;
      } catch (_) {
        // Fall through to a new anonymous sign-up if refresh fails.
      }
    }

    debugLog("Anonymous sign-in starting");
    let response;
    try {
      response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${CONFIG.apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnSecureToken: true })
      });
    } catch (error) {
      const parsedError = parseNetworkError(error, "identitytoolkit.googleapis.com");
      debugError("Anonymous sign-in failed with full error code and message", parsedError.code, parsedError.details);
      throw parsedError;
    }

    if (!response.ok) {
      const text = await response.text();
      const parsedError = parseAuthError(text, "identitytoolkit.googleapis.com");
      debugError("Anonymous sign-in failed with full error code and message", parsedError.code, parsedError.details);
      throw parsedError;
    }

    const data = await response.json();
    const authUser = {
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      localId: data.localId,
      expiresAt: Date.now() + Number(data.expiresIn || 3600) * 1000
    };
    await storage.set({ [AUTH_KEY]: authUser });
    debugLog("Anonymous sign-in success with uid", authUser.localId);
    return authUser;
  }

  async function authQuery() {
    const user = await signInAnonymously();
    return `auth=${encodeURIComponent(user.idToken)}`;
  }

  async function dbUrl(path, query = "", databaseURL = activeDatabaseURL) {
    const auth = await authQuery();
    const suffix = query ? `${auth}&${query}` : auth;
    return `${databaseURL}/${encodePath(path)}.json?${suffix}`;
  }

  async function request(path, options = {}, query = "") {
    const url = await dbUrl(path, query);
    debugLog("Database connected/ref ready", path);
    debugLog("Database URL being used", activeDatabaseURL);
    let response;
    try {
      response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {})
        }
      });
    } catch (error) {
      throw parseNetworkError(error, "realtime-database");
    }
    if (!response.ok) {
      const text = await response.text();
      const parsedError = parseDatabaseError(text, "realtime-database", path);
      if (parsedError.correctUrl && DATABASE_URL_FALLBACKS.includes(parsedError.correctUrl)) {
        activeDatabaseURL = parsedError.correctUrl;
        debugLog("Database URL being used", activeDatabaseURL);
        return request(path, options, query);
      }
      throw parsedError;
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
    const url = `${activeDatabaseURL}/${encodePath(path)}.json?auth=${encodeURIComponent(user.idToken)}`;
    let cache = undefined;
    let closed = false;
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
      if (closed) return;
      const data = JSON.parse(event.data);
      cache = setNestedValue(cache, data.path, data.data);
      callback(cache);
    });
    source.addEventListener("patch", (event) => {
      if (closed) return;
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
      // SSE errors are transient; the browser will auto-reconnect.
      // Only surface the error if the source is in a permanently closed state.
      if (source.readyState === EventSource.CLOSED && !closed) {
        onError?.(new Error(`Firebase stream closed for ${path}`));
      }
    };

    return () => {
      closed = true;
      source.close();
    };
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
    debugLog("Create room clicked");
    debugLog("Create room write path", `rooms/${roomId}/users/{uid}`);
    debugLog("Create room attempted", { roomId, displayName: displayName || "Guest" });
    try {
      const user = await setUserPresence(roomId, displayName, true);
      debugLog("Create room write path", `rooms/${roomId}/meta`);
      await request(`rooms/${roomId}/meta`, {
        method: "PATCH",
        body: JSON.stringify({
          createdAt: Date.now(),
          updatedAt: Date.now(),
          schemaVersion: 1
        })
      });
      await storage.set({ [ROOM_KEY]: roomId, [DISPLAY_NAME_KEY]: displayName || "Guest" });
      debugLog("Create room success", { roomId, userId: user.localId });
      return { roomId, userId: user.localId };
    } catch (error) {
      debugError("Create room failed with full Firebase error code and message", error?.code, error?.message, error?.details);
      throw error;
    }
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
