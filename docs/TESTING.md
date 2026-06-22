# Testing WatchParty

## Load The Extension

1. Open Chrome, Edge, Brave, or Opera.
2. Go to the extensions page.
3. Enable Developer Mode.
4. Click Load unpacked.
5. Select the `extension/` folder.

## Test With Two Chrome Profiles

1. Create or open two different Chrome profiles.
2. Load the unpacked extension in both profiles.
3. Open the same YouTube video in both profiles.
4. In profile A, open the WatchParty popup.
5. Set a display name and click Create room.
6. In profile B, set a display name, paste the room code, and click Join.
7. Confirm both overlays show the same room code.

## Playback Sync Checklist

- Pause in profile A; profile B should pause.
- Play in profile A; profile B should play from the same timestamp.
- Seek in profile A; profile B should jump to the same timestamp.
- Repeat the same actions from profile B.
- Let both videos play for a while; drift correction should only adjust if they differ by more than 1.5 seconds.

## Chat Checklist

- Send a message from profile A.
- Confirm it appears in profile B popup and overlay.
- Send a message from profile B.
- Confirm it appears in profile A popup and overlay.

## WebRTC Checklist

1. Join the same room in both profiles.
2. Click Start call in profile A.
3. Click Start call in profile B.
4. Allow camera and microphone permissions.
5. Confirm local and remote video appear in the floating overlay.
6. Test Mute mic, Camera off, and End call.

## Common Troubleshooting

- If popup says to open a supported streaming tab, click the tab with YouTube or another supported site and reopen the popup.
- If sync waits for video, start playback once so the site creates its HTML5 video element.
- If WebRTC connects on one network but not another, a TURN server may be required in the future.
- If Firebase writes fail, confirm Anonymous Authentication, Realtime Database, and security rules are configured.
