# K1ngkell Firestore Security Specification

## 1. Data Invariants
1. **Master Gate & Channel Integrity**: Chat messages (`/chatChannels/{channelId}/messages/{messageId}`) and typing states (`/chatChannels/{channelId}/typing/{userId}`) cannot exist outside the five allowlisted channels (`general`, `gaming-lounge`, `music-vibes`, `tech-chat`, `announcements`) and must reference an existing `/chatChannels/{channelId}` parent document on single-document operations.
2. **Identity & Ownership**: `authorUid` on chat messages and `uid` on profiles/typing docs must equal `request.auth.uid` upon creation and remain immutable on update. Only verified signed-in users (`request.auth != null && request.auth.token.email_verified == true`) can write.
3. **PII Isolation**: User email and private playlist data live strictly under `/users/{userId}` with owner-only read/write access; `/publicProfiles/{userId}` contains zero PII.
4. **Temporal & Boundary Integrity**: All `createdAt`, `updatedAt`, and `lastSeenAt` timestamps must match `request.time`; every string and list enforces strict `.size()` caps and ID regex validation.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated Profile Create**: `POST /publicProfiles/attacker1` with `auth = null`.
2. **Unverified Email Chat Write**: `POST /chatChannels/general/messages/m1` with `email_verified = false`.
3. **Identity Spoofing on Message**: `POST /chatChannels/general/messages/m2` by `uid = "userA"` setting `authorUid: "userB"`.
4. **Shadow Field Injection on PublicProfile**: `POST /publicProfiles/userA` with extra field `isAdmin: true`.
5. **PII Blanket Read Attempt**: `GET /users/userB` authenticated as `userA`.
6. **Unauthorized Channel Creation**: `POST /chatChannels/evil-room` outside allowed channel enum.
7. **Orphaned Message Creation**: `POST /chatChannels/nonexistent/messages/m3`.
8. **ID Poisoning (Oversized Doc ID)**: `POST /publicProfiles/<200-char-invalid-id!>`.
9. **Client Clock Forgery**: `POST /chatChannels/general/messages/m4` setting `createdAt` to past timestamp instead of `request.time`.
10. **Cross-User Message Deletion**: `DELETE /chatChannels/general/messages/m_userA` executed by `userB`.
11. **Content Tampering via Reaction Update**: `UPDATE /chatChannels/general/messages/m_userA` by `userB` modifying `content` alongside `reactions`.
12. **Unbounded List Exhaustion**: `UPDATE /users/userA` with `likedTrackIds` containing > 200 entries or non-string first element.
