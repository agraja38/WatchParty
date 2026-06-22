# Privacy

WatchParty is designed to coordinate viewing without handling video content.

## Data Stored In Firebase

WatchParty stores:

- Room IDs.
- User presence and display names.
- Playback state: status, current time, timestamp, user ID, platform, and safe title/video identity.
- Chat messages.
- WebRTC signaling data: offers, answers, and ICE candidates.

## Data Not Stored By WatchParty

WatchParty does not store:

- Streaming video files.
- Captured video frames.
- DRM keys.
- Streaming account passwords.
- Payment data.

## Video And Streaming Accounts

Every participant must use their own official streaming account. WatchParty only syncs playback controls; it does not share or redistribute content.

## Audio/Video Calls

Audio/video calls use WebRTC. Media is peer-to-peer when the network allows it. Firebase is used only for signaling, not for relaying camera or microphone media.

## Data Retention

The extension trims chat messages to keep recent messages only, but Firebase rooms do not currently expire automatically. Production deployments should add room expiry cleanup with rules, scheduled jobs, or an admin process.
