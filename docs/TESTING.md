# Testing WatchParty

Use YouTube for playback tests because it is the most reliably controllable platform. Room creation, joining, and chat should work before opening YouTube.

## Prerequisites

- Firebase Anonymous Authentication is enabled.
- Firebase Realtime Database is created.
- Realtime Database rules from `docs/FIREBASE_RULES.md` are published.
- Chrome or another Chromium browser is installed.
- Firefox is installed.

## Firefox Temporary Add-on Test

1. Open Firefox and go to `about:debugging#/runtime/this-firefox`.
2. Click Load Temporary Add-on.
3. Select `extension/manifest.json`.
4. Click Inspect under WatchParty to open the extension console.
5. Open the WatchParty popup from the toolbar.
6. Confirm the popup is not cropped and bottom controls are reachable by scrolling if needed.
7. Click Create room before opening any streaming site.
8. Confirm the status shows `Firebase: Connected` and `Room: In room`.
9. Confirm the room appears in Firebase Realtime Database under `rooms/{roomId}`.
10. Open a YouTube video and refresh the tab.
11. Confirm `WatchParty content script loaded` appears in the YouTube page console.
12. Reopen the popup and confirm the overlay loads on YouTube.
13. Send a chat message and confirm it appears in the popup and overlay.

Expected Firefox console logs include:

- `Firebase app initializing`
- `Firebase app initialized`
- `Auth object created`
- `Anonymous sign-in starting`
- `Anonymous sign-in success with uid`
- `Database object created`
- `Database URL being used`
- `Create room clicked`
- `Firebase write path`
- `Firebase write success`
- `Firebase listener attached`

## Chrome And Firefox Cross-Browser Test

1. Load the extension in Chrome from `chrome://extensions` using Load unpacked.
2. Load the extension in Firefox from `about:debugging` using Load Temporary Add-on.
3. Open the same YouTube video in Chrome and Firefox.
4. Create a room in Chrome.
5. Join the exact same room code in Firefox.
6. Confirm both popups show the same room code.
7. Send chat from Chrome and confirm it appears in Firefox.
8. Send chat from Firefox and confirm it appears in Chrome.
9. Pause in Chrome and confirm Firefox pauses.
10. Play in Firefox and confirm Chrome plays.
11. Seek in Chrome and confirm Firefox seeks.

## Common Firebase Errors

- `auth/operation-not-allowed`: Anonymous Authentication is not enabled.
- `auth/configuration-not-found`: Firebase project/API key configuration is wrong.
- `permission_denied` or `database/permission-denied`: rules are wrong or anonymous auth failed.
- `auth/network-request-failed`: network access to Firebase failed.
- `app/no-app`: Firebase helper did not initialize; reload the temporary add-on.
- `missing databaseURL`: the Firebase config is missing a database URL.
- `blocked by Content Security Policy`: `manifest.json` does not allow Firebase hosts.
- `Could not establish connection. Receiving end does not exist.`: no supported content script is active on the current tab; room creation can still work, but refresh/open YouTube for playback sync.

## Troubleshooting Notes

- If popup says `Open YouTube or a supported streaming site`, room/chat can still work; that message only means playback sync has no active streaming tab.
- If the Firefox popup is cropped, remove and reload the temporary add-on so updated CSS is applied.
- If chat does not cross browsers, confirm both browsers joined the exact same room code and inspect listener logs.
- If playback sync waits for video, start playback once so YouTube creates its HTML5 video element.
- If WebRTC fails on strict networks, future TURN server support may be required.
