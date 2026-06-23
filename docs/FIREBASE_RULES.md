# Firebase Realtime Database Security Rules

WatchParty uses Firebase Anonymous Authentication to protect room data. Realtime Database rules must be published before rooms, chat, sync, or WebRTC signaling can work.

## How To Apply Rules

1. Open the Firebase Console.
2. Select the `watchparty-8c5f9` project.
3. Go to Build > Realtime Database.
4. Open the Rules tab.
5. Paste either the minimal test rules or the recommended rules.
6. Click Publish.

## Minimal Test Rules

Use these rules while debugging Firefox/Chrome connectivity. They are intentionally broad for authenticated users so you can confirm Anonymous Auth and database wiring first.

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

Important setup checks:

- Anonymous Authentication must be enabled.
- Realtime Database must be created, not only Firestore.
- Rules must be published after editing.
- If the popup shows `permission_denied` or `database/permission-denied`, rules are wrong or anonymous auth failed.

## Recommended Rules

Use these after basic room creation and cross-browser chat are working.

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": "auth != null",
        "metadata": {
          ".write": "auth != null"
        },
        "meta": {
          ".write": "auth != null"
        },
        "state": {
          ".write": "auth != null && newData.hasChildren(['status', 'time', 'updatedAt', 'updatedBy', 'actionId', 'platform', 'titleOrVideoId']) && (newData.child('status').val() == 'playing' || newData.child('status').val() == 'paused') && newData.child('updatedBy').val() == auth.uid"
        },
        "users": {
          "$userId": {
            ".write": "auth != null && auth.uid == $userId",
            ".validate": "newData.hasChildren(['displayName', 'joinedAt', 'online'])"
          }
        },
        "chat": {
          "$messageId": {
            ".write": "auth != null && newData.child('userId').val() == auth.uid && newData.child('text').isString() && newData.child('text').val().length <= 500",
            ".validate": "newData.hasChildren(['userId', 'displayName', 'text', 'createdAt'])"
          }
        },
        "webrtc": {
          ".write": "auth != null"
        }
      }
    }
  }
}
```

## Database Schema Reference

- `rooms/{roomId}/metadata`: Room creation and schema metadata.
- `rooms/{roomId}/meta`: Legacy fallback used only if existing rules deny `metadata`.
- `rooms/{roomId}/state`: Playback status, current time, platform, title/video identity, and action ID.
- `rooms/{roomId}/users/{userId}`: Display name, joined time, and online presence.
- `rooms/{roomId}/chat/{messageId}`: Room chat messages.
- `rooms/{roomId}/webrtc`: WebRTC offers, answers, and ICE candidates.

## Production Hardening Ideas

- Add room membership checks so only users under `rooms/{roomId}/users/{auth.uid}` can write room data.
- Add room expiry cleanup for stale rooms.
- Add stricter validation for WebRTC signaling payloads.
- Consider Firebase App Check before public release.
