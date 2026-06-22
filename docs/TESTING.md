# Testing WatchParty

Follow this guide to verify synchronization, chat features, and audio/video calls using a local developer environment.

---

## 1. Load the Extension Unpacked

1.  Open a Chromium-based browser (Chrome, Edge, Brave, or Opera).
2.  Navigate to the extensions settings page:
    *   **Chrome**: `chrome://extensions`
    *   **Edge**: `edge://extensions`
3.  Enable **Developer Mode** in the settings panel.
4.  Click **Load unpacked** and select the `extension/` directory of this project.

---

## 2. Test with Two Chrome Profiles

Using two separate browser profiles is the easiest way to simulate two distinct users on the same machine:

1.  Click your profile icon in the top right of Chrome and click **Add** to create a second, clean Chrome profile (or open an existing secondary profile).
2.  Load the unpacked WatchParty extension into this second profile as well.
3.  Arrange the two browser windows side-by-side on your desktop.

---

## 3. YouTube Testing (Start Here)

YouTube is the primary supported test platform. Start here to verify basic sync operations:

1.  Open the **same YouTube video URL** in both Profile A and Profile B.
2.  On Profile A, open the WatchParty extension popup. Type a display name (e.g., "Alice") and click **Create room**.
3.  Locate the generated room code in the popup. Click the code box to copy it.
4.  On Profile B, open the WatchParty popup. Type a display name (e.g., "Bob"), paste the code in the **Join room** box, and click **Join**.
5.  **Verify Status**: Both Profile A and Profile B popups and floating page overlays should display the shared room ID. The overlay should report: `Platform: YouTube` and `Sync: idle`.

### Playback Sync Checklist
*   [ ] **Pause**: Pause the video in Profile A. Profile B's player must pause within a split second.
*   [ ] **Play**: Resume the video in Profile A. Profile B's player must resume from the exact same timestamp.
*   [ ] **Seek**: Click any point along the YouTube progress timeline in Profile A. Profile B's player must jump to that timeline point.
*   [ ] **Drift Correction**: Let both profiles play. The adapter allows up to 1.5 seconds of drift before forcing a corrective seek.
*   [ ] **Bidirectional Sync**: Repeat the pause, play, and seek actions from Profile B. Verify Profile A follows them.

### Chat Checklist
*   [ ] **Popup Chat**: Type a message in Profile A's popup chat and click **Send**. Verify it appears in Profile B's popup and on-page overlay.
*   [ ] **Overlay Chat**: Type a message in Profile B's on-page overlay input. Press Enter and verify Profile A receives it.

---

## 4. WebRTC Camera/Microphone Testing

Verify WebRTC audio and video signaling and peer-to-peer media streams:

1.  Ensure both Profile A and Profile B are in the same room.
2.  Click **Start call** in the Profile A popup or overlay.
3.  Click **Start call** in the Profile B popup or overlay.
4.  **Grant Permissions**: When prompted by your browser, click **Allow** to grant camera and microphone access to both tabs.
5.  **Verify Streams**:
    *   [ ] The floating overlays will automatically display video elements (hiding the empty placeholders).
    *   [ ] Profile A should display their local camera stream and Profile B's remote camera stream.
    *   [ ] Profile B should display their local camera stream and Profile A's remote camera stream.
6.  **Verify Call Controls**:
    *   [ ] Click **Mute mic** on Profile A. Verify the status updates and Profile B's audio track is muted.
    *   [ ] Click **Camera off** on Profile A. Verify that Profile A's camera feed pauses or goes dark.
    *   [ ] Click **End call** on either profile. Verify both overlays remove the video elements and return to standard text chat.

---

## 5. Troubleshooting & Database Validation

*   **Status: "Open a supported streaming tab"**: Click on the tab containing your active video player first, then open the extension popup. The popup targets whichever tab is active in the current window.
*   **Status: "waiting for video"**: Make sure you have clicked play at least once on the streaming site so that the site initializes its HTML5 `<video>` element.
*   **Firebase Failures**: If rooms do not connect or chat messages fail to send, confirm that Anonymous Authentication and Realtime Database are enabled in your console and that your rules are updated.
*   **WebRTC Fails to Connect**: The default setup uses Google's public STUN server. If you are behind symmetric corporate firewalls or NATs, WebRTC connection states might time out. A dedicated TURN server would be required.
