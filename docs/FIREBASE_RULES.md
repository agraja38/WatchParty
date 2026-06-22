# Firebase Rules

WatchParty uses Firebase Anonymous Authentication and Firebase Realtime Database.

The Firebase web API key is public by design for Firebase web apps. Protect the database with rules.

## Example Development Rules

These rules require anonymous authentication, allow authenticated users to read rooms, limit writes to expected room paths, and prevent unauthenticated access.

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": "auth != null",
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

## Production Hardening Ideas

- Add room membership checks so only users listed under `rooms/{roomId}/users/{auth.uid}` can write state, chat, and signaling.
- Add `.validate` rules for numeric playback time and timestamp bounds.
- Add Cloud Functions or scheduled cleanup if rooms should expire automatically.
- Consider App Check for abuse reduction.
- Use stricter WebRTC signaling validation before public launch.

## Database Paths

```text
rooms/{roomId}/state
rooms/{roomId}/chat/{messageId}
rooms/{roomId}/users/{userId}
rooms/{roomId}/webrtc
```
