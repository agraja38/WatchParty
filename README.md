# WatchParty

WatchParty is a Manifest V3 browser extension for synchronizing video playback on official streaming websites. It is designed first for Chromium-based browsers (Chrome, Edge, Brave, Opera) and structured to support Firefox in the future.

WatchParty syncs playback state only—such as play, pause, current playback position, and active streaming platform. It also includes room chat and a two-person WebRTC video/audio call.

> [!IMPORTANT]
> **No Video Streaming or Capture**: WatchParty does **not** stream, capture, record, download, decrypt, or rehost video. It does not touch DRM-protected content or bypass player paywalls.
> 
> **Separate Accounts Required**: Every user must have their own official streaming account (e.g., YouTube Premium, Netflix subscription) and navigate to the same video/title independently. WatchParty only synchronizes the browser playback controls.

---

## Supported Sites & Limitations

### Fully Supported & Controllable
*   **YouTube**: Fully implemented playback synchronization, chat, and WebRTC calls.
*   **Generic HTML5 Video**: Any webpage running a standard HTML5 `<video>` tag.

### Passive Detection / Best-Effort Only
*   **Netflix, Disney+, Prime Video, Hulu, Max (HBO), Paramount+**
    *   **Limitation**: WatchParty uses best-effort, safe detection of page-level HTML5 media. If a platform dynamically obfuscates, locks, or blocks programmatic playback API controls (play, pause, seek), the extension will display a clear "waiting/unsupported" state rather than attempting to bypass these player protections.

---

## Firebase Setup Guide

WatchParty uses Firebase for user authentication, room state sync, chat, and WebRTC signaling. The extension contains a preconfigured Firebase configuration, but you must enable the services in your console:

1.  **Create a Firebase Project**:
    *   Go to the [Firebase Console](https://console.firebase.google.com/) and click **Add Project**. Name it `WatchParty`.
2.  **Enable Anonymous Authentication**:
    *   In the Firebase sidebar, go to **Build** > **Authentication** > **Sign-in method**.
    *   Click **Add new provider**, select **Anonymous**, enable it, and click **Save**.
3.  **Enable Realtime Database**:
    *   In the sidebar, go to **Build** > **Realtime Database** and click **Create Database**.
    *   Choose a database location (the default configuration uses `us-central1` or your default `firebaseio.com` URL).
    *   Start in **test mode** or edit the database rules directly.
4.  **Publish Security Rules**:
    *   Select the **Rules** tab in your Realtime Database.
    *   Paste the security rules found in [FIREBASE_RULES.md](docs/FIREBASE_RULES.md) to ensure room state, WebRTC coordinates, and chat messages are protected.

*Note: The Firebase web API key is safe to be exposed in the frontend code. Security is enforced by Authentication and Realtime Database rules.*

---

## Installation (Chrome, Edge, Brave, Opera)

1.  Download or clone this repository to your local machine.
2.  Open your browser's extension management page:
    *   **Chrome**: Open a new tab and go to `chrome://extensions`.
    *   **Edge**: Open a new tab and go to `edge://extensions`.
3.  Toggle the **Developer Mode** switch at the top right to **On**.
4.  Click the **Load unpacked** button at the top left.
5.  Select the `extension/` folder inside this project directory.
6.  (Optional) Click the puzzle icon in your browser toolbar and pin **WatchParty** for quick access.

---

## Testing Playback Sync & WebRTC

To test the extension locally:

1.  **Open Two Chrome Profiles**: Load the unpacked extension under two separate browser profiles or use two different Chromium browsers.
2.  **Open YouTube**: Navigate to the exact same YouTube video in both profiles.
3.  **Create Room (Profile A)**: Open the WatchParty popup, type a display name, and click **Create room**.
4.  **Join Room (Profile B)**: Open the WatchParty popup, type a display name, enter the room code from Profile A, and click **Join**.
5.  **Test Playback Sync**: Pause, play, or drag the seek bar on Profile A. Verify that Profile B mirrors the action.
6.  **Test Call (WebRTC)**: Click **Start call** in both popups or overlays, allow camera/microphone permissions when prompted, and verify that peer-to-peer audio and video display correctly.

For a detailed step-by-step testing plan, see [TESTING.md](docs/TESTING.md).

---

## Project Structure

*   [extension/](file:///C:/Users/agraj/.gemini/antigravity/scratch/watchparty/extension): Contains the manifest, background/content scripts, popup UI, and WebRTC managers.
*   [website/](file:///C:/Users/agraj/.gemini/antigravity/scratch/watchparty/website): Landing page codebase introducing the utility.
*   [docs/](file:///C:/Users/agraj/.gemini/antigravity/scratch/watchparty/docs):
    *   [FIREBASE_RULES.md](docs/FIREBASE_RULES.md): Database authorization rules.
    *   [LIMITATIONS.md](docs/LIMITATIONS.md): Detailed limitations and DRM boundaries.
    *   [PRIVACY.md](docs/PRIVACY.md): Data retention and sharing boundaries.
    *   [TESTING.md](docs/TESTING.md): Chrome profile and media testing checklists.

---

## Privacy & Security

WatchParty store rooms, active users, chat strings, and WebRTC candidate handshakes in the Firebase Realtime Database. Realtime data can be trimmed or configured to expire. Media streams flow directly peer-to-peer via WebRTC. See [PRIVACY.md](docs/PRIVACY.md) for more details.
