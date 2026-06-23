# Firebase Realtime Database Security Rules

WatchParty relies on Firebase Anonymous Authentication to secure your database. You must configure rules to authorize read and write access for authenticated users while preventing abuse.

---

## How to Apply Rules

1.  Open the [Firebase Console](https://console.firebase.google.com/).
2.  Navigate to **Build** > **Realtime Database** from the sidebar.
3.  Click the **Rules** tab at the top of the panel.
4.  Paste the JSON rules block below into the editor.
5.  Click **Publish** to apply the configuration.

---

## Recommended Rules

These rules require all readers and writers to be authenticated via Firebase Anonymous Authentication, restrict writing of user profiles to the owner of that user ID, validate that message structures match schema boundaries, and limit room chat messages to 500 characters.

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

---

## Minimal Test Rules (Use For Debugging)

If room creation fails with `permission_denied`, temporarily use these rules to verify auth/write wiring:

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

Important:

- Anonymous Authentication must be enabled in Firebase Console.
- Realtime Database must be created (not Firestore only).
- Rules must be published after editing.
- If popup status shows `permission_denied` or `database/permission-denied`, rules are wrong or anonymous auth failed.

---

## Database Schema Reference

For debugging or customized rule development, WatchParty structures database paths as follows:

*   **`rooms/{roomId}/meta`**: Room creation and schema details.
*   **`rooms/{roomId}/state`**: Active playback state coordinates (paused, playing, current time, active adapter name, video title).
*   **`rooms/{roomId}/users/{userId}`**: Display name, online presence, and time joined.
*   **`rooms/{roomId}/chat/{messageId}`**: Temporary room text messages.
*   **`rooms/{roomId}/webrtc`**: Peer connection signal offers, answers, and ICE candidate paths.

---

## Production Security Recommendations

For public deployments, consider these extra precautions:
*   **App Check**: Integrate Firebase App Check to prevent unauthorized apps (non-extension browsers) from calling your database.
*   **Room Expiry**: Write a cloud function or cron task to sweep and delete database directories of inactive rooms older than 24 hours.
*   **WebRTC Validation**: Require users writing to `webrtc` paths to be registered members of the room under `rooms/{roomId}/users/{auth.uid}`.
