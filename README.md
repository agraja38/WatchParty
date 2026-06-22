# WatchParty

WatchParty is a Manifest V3 browser extension for syncing playback on official streaming websites. It is designed for Chrome, Edge, Brave, Opera, and other Chromium-based browsers first, with a project layout that can support Firefox later.

WatchParty syncs playback state only: play, pause, seek position, current time, platform name, and a safe title/video identity when the page exposes one. It also includes room chat and a two-person audio/video call using WebRTC.

## What WatchParty Does

- Creates short random room codes.
- Lets another user join the same room code.
- Tracks online users in Firebase Realtime Database.
- Syncs HTML5 player play, pause, seek, and current time.
- Corrects playback drift only when users are more than 1.5 seconds apart.
- Provides room chat in the popup and floating page overlay.
- Supports a two-person audio/video call with WebRTC and the public STUN server `stun:stun.l.google.com:19302`.
- Uses Firebase Anonymous Authentication and Firebase Realtime Database.

## What WatchParty Does Not Do

- It does not download, capture, stream, rehost, decrypt, or bypass DRM-protected video.
- It does not access video files directly.
- It does not replace a streaming subscription.
- It does not share paid content between accounts.
- It does not guarantee control on every streaming platform, because official players and DRM-protected sites vary.

Every user must watch from their own official streaming account. WatchParty only coordinates player state between browsers.

## Supported Sites

Fully implemented safe support:

- YouTube
- Generic HTML5 video pages

Best-effort safe HTML5 detection only:

- Netflix
- Disney+
- Prime Video / Amazon
- Hulu
- Max / HBO Max
- Paramount+

If a platform does not expose a controllable HTML5 video element, WatchParty shows a clear waiting/unsupported status rather than trying to bypass the player.

## Project Structure

```text
extension/
  manifest.json
  popup.html
  popup.css
  popup.js
  content.js
  firebase.js
  sync.js
  chat.js
  webrtc.js
  ui.js
  adapters/
  assets/
website/
docs/
```

## Firebase Setup

The extension is preconfigured for the `watchparty-8c5f9` Firebase project and Realtime Database URL:

```text
https://watchparty-8c5f9-default-rtdb.asia-southeast1.firebasedatabase.app
```

Manual setup still required:

1. Enable Anonymous Authentication in Firebase Authentication.
2. Enable Realtime Database.
3. Publish safe database rules. Start with the example in [docs/FIREBASE_RULES.md](docs/FIREBASE_RULES.md).
4. Add authorized domains if Firebase asks for them during browser extension testing.

The Firebase web API key is included in frontend code because Firebase web apps normally expose it. Security must come from Authentication and Realtime Database rules, not from hiding this key.

## Load In Chrome, Edge, Brave, Or Opera

1. Open your browser extensions page.
2. Enable Developer Mode.
3. Choose Load unpacked.
4. Select the `extension/` folder from this repository.
5. Pin WatchParty if you want easy popup access.

## Quick YouTube Test

1. Load the unpacked extension in two Chrome profiles.
2. Open the same YouTube video in both profiles.
3. In profile A, click WatchParty, enter a display name, and create a room.
4. In profile B, enter a display name and join using the room code.
5. Pause, play, and seek in either profile.
6. Confirm the other profile follows the state change.
7. Send chat messages from both profiles.
8. Click Start call in both profiles and allow camera/mic permissions.

More detail is in [docs/TESTING.md](docs/TESTING.md).

## Privacy

WatchParty stores room presence, playback state, chat messages, and WebRTC signaling metadata in Firebase Realtime Database. It does not store video streams. WebRTC media flows peer-to-peer when possible. See [docs/PRIVACY.md](docs/PRIVACY.md).

## Known Limitations

See [docs/LIMITATIONS.md](docs/LIMITATIONS.md) for platform limitations, WebRTC constraints, future TURN server support, and future Firefox support.

## Repository

https://github.com/agraja38/WatchParty
