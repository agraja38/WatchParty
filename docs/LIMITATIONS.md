# Limitations & DRM Boundaries

This document details the boundaries, platform limitations, and WebRTC network constraints of the WatchParty extension.

---

## 1. Video & DRM Boundaries

WatchParty is designed strictly as a synchronization and chat layer. It complies with streaming rights and DRM restrictions by operating under these core design principles:

*   **No Video Streaming or Rehosting**: WatchParty does **not** capture, record, stream, download, mirror, or rehost video files or streams.
*   **No Decryption**: WatchParty does **not** bypass, decrypt, or access DRM (Digital Rights Management) technologies, widevine keys, or player sandboxes.
*   **Individual Account Requirement**: Every user must log in to their own official, active streaming account (e.g., YouTube, Netflix, Hulu, Prime Video) and navigate to the same media page. The extension only aligns the browser-level player timers and play/pause events.

---

## 2. Platform-Specific Limitations

WatchParty controls streaming players using safe, standard page-level HTML5 `<video>` element interfaces. Because different platforms customize their player logic, some restrictions apply:

### Fully Supported
*   **YouTube**: Standard player APIs are accessible. Play, pause, seek, and drift correction work consistently.
*   **Generic HTML5 Video**: Any website utilizing native HTML5 `<video>` controls is fully supported.

### Passive / Best-Effort Only
*   **Netflix, Disney+, Prime Video, Hulu, Max (HBO), Paramount+**
    *   **Direct Control Barriers**: Many major streaming platforms use obfuscated web structures, shadow DOMs, or custom video players that actively block programmatic scripts from executing `play()`, `pause()`, or setting `currentTime` (seek).
    *   **Sync Behavior**: WatchParty will attempt to detect the player presence. If the platform player actively blocks script controls, WatchParty will display a warning status (e.g., `waiting for a safe HTML5 video element` or `Unsupported`) rather than attempting to bypass or hack the platform code. In these cases, actions like manual play/pause alignment by users are recommended.

---

## 3. WebRTC Call Limitations

*   **2-Person Maximum**: The WebRTC calling manager is currently built to support signaling and handshakes between two connected users within a room.
*   **Network Firewalls (STUN vs. TURN)**: The call uses Google's public STUN server (`stun:stun.l.google.com:19302`) to resolve local IP addresses. If either participant is behind a symmetric NAT or highly restrictive firewall (such as corporate or school networks), WebRTC media streams will fail to resolve. A dedicated TURN relay server would be required for these environments.

---

## 4. Presence & Room Cleanups

*   **Best-Effort Presence**: User online/offline statuses are synced via Firebase database listeners. While a browser tab shutdown is caught on a `beforeunload` event, unexpected network disconnections, browser crashes, or operating system sleep modes may result in stale "ghost" users showing in the room metadata.
*   **Automatic Room Expiry**: The backend is serverless. To keep database usage minimal, a production environment should schedule periodic room cleanups (e.g., via Cloud Functions) to clear rooms that haven't been modified in over 24 hours. See [FIREBASE_RULES.md](FIREBASE_RULES.md) for securing database paths.
