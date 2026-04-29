# Security Specification: SoulMirror

## 1. Data Invariants
- **Users**: A user document must exist for every user. Profile data is immutable once created except for `displayName` and `photoURL`.
- **Sessions**: Every session must belong to the authenticated user (`userId` matches `request.auth.uid`). Sessions must start as `active`. Once `status` is `completed`, no further message updates are allowed.
- **Notes**: Notes are associated with a user and optionally a session. They store the final report.

## 2. The Dirty Dozen Payloads
1. **Identity Spoofing**: Create a `Session` where `userId` is someone else's UID.
2. **Path Poisoning**: Inject a 2KB string as a `sessionId`.
3. **Cross-User Leak**: Read a `Session` document belonging to `user_B` while authenticated as `user_A`.
4. **Shadow Update**: Add a field `isVerified: true` to the `User` document.
5. **State Shortcut**: Create a `Session` directly with `status: 'completed'`.
6. **Terminal State Bypass**: Update a message in a `Session` after `status` is already `completed`.
7. **Resource Poisoning**: Send a message `content` string larger than 50KB.
8. **PII Leak**: Read the `email` field of another user's `User` profile.
9. **Orphaned Record**: Create a `Note` for a non-existent `sessionId`.
10. **Timestamp Fraud**: Provide a client-side `createdAt` timestamp from 2001.
11. **Immutable Key Change**: Try to change `userId` of an existing `Session`.
12. **Blanket Query**: Query all sessions without a `userId` filter.

## 3. Test Runner (Mock Logic)
The following tests will be implemented in `DRAFT_firestore.rules` and verified.

```typescript
// firestore.rules.test.ts (Conceptual)
// 1. expect(createSession(otherUserId)).toBeDenied();
// 2. expect(createSession(invalidId)).toBeDenied();
// 3. expect(readSession(otherUser)).toBeDenied();
// ... etc
```
