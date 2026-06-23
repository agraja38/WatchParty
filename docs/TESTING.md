# Testing WatchParty — Final Manual Checklist

Use this checklist before any release. All steps use YouTube as the primary test target because it is the most reliably controllable platform.

---

## Prerequisites

- Google Chrome (or Edge/Brave) installed.
- This repository cloned locally.
- Firebase project configured with:
  - Anonymous Authentication enabled.
  - Realtime Database enabled.
  - Security rules from `FIREBASE_RULES.md` applied.

---

## Firefox Popup Check (Temporary Add-on)

1. Open Firefox and go to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on** and choose `extension/manifest.json`.
3. Pin WatchParty and open the popup from the toolbar. A YouTube tab is not required for room creation.
4. Click **Create room** before opening any streaming site.
5. Verify popup width is full and readable (not a thin vertical strip).
6. Verify all sections are visible: Display Name, Create/Join Room, Chat, and Call controls.
7. Verify status messages:
   - `Firebase: Connected` appears in the top badge.
   - `Room: Not in room` appears until you create/join.
   - After creating a room without YouTube open, status may show `Room ready. Open YouTube or a supported streaming site.`
8. In `about:debugging`, click **Inspect** for the extension and check popup console logs:
   - `Firebase app initializing`
   - `Firebase app initialized`
   - `Auth object created`
   - `Database object created`
   - `Database URL being used`
   - `Anonymous sign-in starting`
   - `Anonymous sign-in success with uid`
   - `Create room clicked`
   - `Create room write path`
   - `Create room success`
9. Open Firebase Realtime Database and verify the room exists under `rooms/{roomId}`.
10. Open a YouTube video tab and refresh it after loading the temporary add-on.
11. Open YouTube page DevTools console and verify `WatchParty content script loaded` appears.
12. Reopen the popup and confirm playback sync status targets the YouTube tab.
13. In a second Firefox profile, load the same temporary add-on and join using the room code.
14. If room creation fails, copy the exact Firebase error from popup and extension console.

### Firefox Firebase Debug Loop

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Inspect** under WatchParty extension to open extension console.
3. Open popup and click **Create room**.
4. Capture these log lines:
   - `Anonymous sign-in starting`
   - `Anonymous sign-in failed with full error code and message` (if it fails)
   - `Create room failed with full Firebase error code and message` (if it fails)
5. If you see `permission_denied` or `database/permission-denied`, publish/update rules in Realtime Database and retry **Create room**.
6. If you see `auth/operation-not-allowed`, enable Anonymous Authentication.
7. If you see `auth/configuration-not-found`, confirm the Firebase project and API key match.
8. If you see `auth/network-request-failed`, check network access and extension console errors.
9. If you see `app/no-app` or `missing databaseURL`, reload the temporary add-on and inspect `firebase.js`.
10. If you see `blocked by Content Security Policy`, confirm `manifest.json` allows `identitytoolkit.googleapis.com`, `securetoken.googleapis.com`, and both Realtime Database hosts.
11. If you see `Could not establish connection. Receiving end does not exist.`, open or refresh YouTube; room creation can still work without that tab.

---

## Step 1 — Load Unpacked Extension

1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer Mode** (top-right toggle).
3. Click **Load unpacked** and select the `extension/` folder of this project.
4. Verify the WatchParty extension appears with no errors. If icons are missing, they appear blank but the extension is otherwise functional.
5. (Optional) Click the puzzle icon in the toolbar and pin WatchParty for easier access.

---

## Step 2 — Open YouTube in Two Chrome Profiles

1. In Chrome, click your profile avatar (top-right) and create a second Chrome profile if you don't already have one.
2. Load the WatchParty extension in the second profile the same way as Step 1.
3. In **both** profiles, navigate to the same YouTube video URL (e.g., any public YouTube video).
4. Let the video load until it is ready to play (thumbnail → playable state).

---

## Step 3 — Create a Room (Profile A)

1. In Profile A, click the WatchParty extension icon to open the popup.
2. Set a **Display name** (e.g., "Alice").
3. Click **Create room**.
4. Verify:
   - [ ] The popup switches to "in room" view — Create/Join inputs are hidden.
   - [ ] A room code badge (e.g., `ABC123`) appears and shows a 📋 copy icon.
   - [ ] Status pill reads **Connected**.
   - [ ] The floating on-page overlay appears on the YouTube tab with the room code in the header.
   - [ ] Overlay shows `Platform: YouTube` and `Sync: Sync ready on YouTube.`.
   - [ ] Browser developer console shows no errors.

---

## Step 4 — Join a Room (Profile B)

1. In Profile A, click the room code badge to copy it to clipboard.
2. In Profile B, click the WatchParty extension icon.
3. Set a **Display name** (e.g., "Bob").
4. Paste the code in the **Join room** field and click **Join**.
5. Verify:
   - [ ] Profile B popup switches to "in room" view with the same room code.
   - [ ] Profile B overlay appears on the YouTube tab.
   - [ ] Status reads **Connected** in Profile B.

---

## Step 5 — Test Play Sync

1. Pause the video in Profile A before starting.
2. Click **Play** in Profile A.
3. Verify:
   - [ ] Profile B's video starts playing within ~1 second.
   - [ ] Overlay sync status briefly shows `Applied playing from room.` on Profile B.

---

## Step 6 — Test Pause Sync

1. While both videos are playing, click **Pause** in Profile A.
2. Verify:
   - [ ] Profile B's video pauses within ~1 second.
   - [ ] Overlay sync status briefly shows `Applied paused from room.` on Profile B.

---

## Step 7 — Test Seek Sync

1. In Profile A, drag the YouTube timeline bar to a different position (seek).
2. Verify:
   - [ ] Profile B's player jumps to the same timestamp within ~2 seconds.
3. Try from Profile B: seek to a different position.
4. Verify:
   - [ ] Profile A's player jumps to match Profile B's seek.

---

## Step 8 — Test Chat

1. In Profile A popup, type a message in the chat box and click **Send** (or press Enter).
2. Verify:
   - [ ] The message appears in Profile A's popup chat with Alice's display name.
   - [ ] The message appears in Profile B's popup chat AND in the on-page overlay chat.
3. Reply from Profile B.
4. Verify:
   - [ ] The reply appears in Profile A's popup and overlay.

---

## Step 9 — Test 2-Person WebRTC Call

1. In Profile A popup (while in room), click **Start call**.
2. Browser will request camera and microphone permissions — click **Allow**.
3. In Profile B popup, click **Start call**.
4. Browser will request permissions — click **Allow**.
5. Verify:
   - [ ] Profile A overlay shows its local camera feed and Profile B's remote video.
   - [ ] Profile B overlay shows its local camera feed and Profile A's remote video.
   - [ ] Call status shows `Call: connected` in both overlays.
   - [ ] Overlay call controls switch: **Start call** hidden, **End call / Mute mic / Camera off** visible.
6. Click **Mute mic** in Profile A.
   - [ ] Button label changes to **Unmute mic** and turns amber/warning color.
7. Click **Camera off** in Profile A.
   - [ ] Button label changes to **Camera on** and turns amber/warning color.
   - [ ] Profile A's video feed goes dark.
8. Click **End call** in Profile A.
   - [ ] Both overlays remove video feeds and return to chat-only view.
   - [ ] Call status shows `Call ended.`.
   - [ ] **Start call** button reappears.

---

## Step 10 — Test Leave Room

1. In Profile A popup, click **Leave room**.
2. Verify:
   - [ ] Profile A popup returns to "no room" state (Create/Join inputs reappear).
   - [ ] Profile A's on-page overlay disappears from the YouTube tab.
   - [ ] Status reads **Disconnected**.
3. Confirm Profile B is still in the room.
   - [ ] Profile B's overlay still shows the room code and sync status.

---

## Step 11 — Check Console for Errors

1. Right-click the WatchParty extension icon → **Inspect popup** (or open DevTools on the streaming tab).
2. Open the **Console** tab.
3. Verify:
   - [ ] No red errors related to WatchParty scripts.
   - [ ] No `TypeError`, `ReferenceError`, or undefined property errors from `firebase.js`, `content.js`, `ui.js`, `webrtc.js`, `sync.js`, or `chat.js`.
   - [ ] Firebase auth and Realtime Database calls show `200 OK` (or no errors).

---

## Known Limitations (Do Not Report as Bugs)

- **Netflix, Disney+, Prime Video, Hulu, Max, Paramount+**: Sync relies on the platform's HTML5 `<video>` element being accessible to scripts. If the platform blocks programmatic control, the overlay will show `Sync: waiting for a safe HTML5 video element`. This is expected behavior.
- **WebRTC behind symmetric NAT**: Two users on enterprise/school networks without open UDP ports may fail to connect. A TURN server is not included — this is a known limitation.
- **Presence drift**: If a tab crashes or the network drops suddenly, the user's "online" status in Firebase may stay stuck until the next session cleans it up.
- **1-hour token expiry**: Firebase auth tokens expire after 1 hour. The extension auto-refreshes using the stored refresh token, but a very long session without any action may require reopening the popup.

---

## Remaining Manual Setup (Before First Use)

1. Go to [Firebase Console](https://console.firebase.google.com/) → your `watchparty-8c5f9` project.
2. Enable **Anonymous Authentication** under Build → Authentication → Sign-in method.
3. Enable **Realtime Database** under Build → Realtime Database.
4. Paste the rules from `docs/FIREBASE_RULES.md` into the Realtime Database Rules tab and click **Publish**.

---

## Common Troubleshooting

- If popup says to open a supported streaming tab, click the tab with YouTube or another supported site and reopen the popup.
- If sync waits for video, start playback once so the site creates its HTML5 video element.
- If WebRTC connects on one network but not another, a TURN server may be required in the future.
- If Firebase writes fail, confirm Anonymous Authentication, Realtime Database, and security rules are configured.
- If Firefox popup is narrow, remove and re-load the temporary add-on from `about:debugging` so updated popup CSS is applied.
- If popup shows `Firebase: Error`, inspect the extension console for `Anonymous auth error` and verify `identitytoolkit.googleapis.com`, `securetoken.googleapis.com`, and Realtime Database hosts are reachable.
- If popup cannot detect a YouTube tab, refresh the YouTube page after loading the temporary add-on so content scripts inject.
- Common Firebase error codes to check: `auth/operation-not-allowed`, `auth/configuration-not-found`, `database/permission-denied`, `auth/network-request-failed`, `app/no-app`.
- If you see `Could not establish connection. Receiving end does not exist.`, refresh the YouTube tab so content scripts re-inject.
