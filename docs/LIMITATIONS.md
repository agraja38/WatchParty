# Limitations

## Streaming Platform Control

WatchParty controls only safe page-level HTML5 video elements. YouTube and generic HTML5 video pages are the primary supported targets.

Netflix, Disney+, Prime Video, Hulu, Max/HBO, and Paramount+ are best-effort only. If a site hides or blocks programmatic play, pause, or seek controls, WatchParty will not bypass those protections.

## DRM Boundary

WatchParty does not download, capture, stream, rehost, decrypt, or bypass DRM-protected video. It never tries to access video files directly.

## Account Requirement

Every user needs their own official streaming account and must open the same title independently. WatchParty is a sync and chat layer, not a content-sharing service.

## WebRTC

The current call feature is limited to two users. It uses the public STUN server:

```text
stun:stun.l.google.com:19302
```

Some networks require TURN relay servers. TURN is intentionally left as a future improvement because reliable TURN generally requires a hosted service.

## Firebase Cleanup

Presence cleanup is best-effort. Browser shutdowns, crashes, and network changes can leave stale online state until a future cleanup process removes it.

## Firefox Support

The source layout separates manifest, popup, content scripts, adapters, and shared helpers so Firefox support can be added later. Firefox may require manifest changes, API compatibility checks, and retesting of extension storage, host permissions, and content script behavior.
