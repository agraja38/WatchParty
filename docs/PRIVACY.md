# Privacy Policy

WatchParty values your privacy and is built from the ground up to coordinate video viewing sessions without exposing, relaying, or storing your personal video content.

---

## 1. Core Principles

*   **No Video Capture**: WatchParty does **not** stream, capture, record, download, decrypt, or rehost video.
*   **No DRM Access**: The extension has no access to your digital rights management keys, video files, or player decryptors.
*   **No Password/Credentials Storing**: WatchParty never reads, intercept, or stores your streaming account logins, passwords, or payment cards.
*   **Separate Accounts Required**: Every user must use their own official streaming account (e.g., YouTube, Netflix, Disney+). The extension only coordinates playback commands (play, pause, seek position).

---

## 2. What Data Is Shared & Coordinated

To make synchronization and calling work, WatchParty communicates with your Firebase database instance. The following data is synchronized:

*   **Room Code**: A randomized room ID that coordinates users.
*   **Display Name**: The temporary nickname you type in the popup.
*   **Presence Status**: Whether you are currently online, offline, or have closed the tab.
*   **Playback State**: Play/pause status, player time (e.g., `12:45`), active website, and title/video identifier (if exposed by the page).
*   **Chat Messages**: Room chat messages, sender display name, and timestamp.
*   **WebRTC Signaling**: SDP offers, answers, and ICE candidate details needed to open a direct browser-to-browser connection.

---

## 3. Audio & Video Calls

*   **Peer-to-Peer Calls**: When you start a video/audio call, the camera and microphone media streams flow **directly peer-to-peer** between the two users.
*   **Signaling Only**: Firebase is only used to exchange network handshake data (offers, answers, and candidates). Your camera and microphone media **never** pass through Firebase databases.

---

## 4. Data Retention

*   **Temporary Data**: Chat messages and WebRTC signaling coordinates are written to transient room paths in your Realtime Database.
*   **Data Control**: Because you deploy and manage your own Firebase database rules, you have full control over data retention. Rooms and database values can be deleted manually, or programmed to expire via Cloud Functions.
