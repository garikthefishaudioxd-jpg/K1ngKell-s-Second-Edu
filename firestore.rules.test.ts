export interface DirtyDozenScenario {
  id: number;
  name: string;
  targetPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expectedOutcome: 'PERMISSION_DENIED';
  payload?: Record<string, unknown>;
}

export const DIRTY_DOZEN_SCENARIOS: DirtyDozenScenario[] = [
  {
    id: 1,
    name: 'Unauthenticated PublicProfile Create',
    targetPath: 'publicProfiles/attacker1',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: { uid: 'attacker1', username: 'attacker' },
  },
  {
    id: 2,
    name: 'Unverified Email Message Create',
    targetPath: 'chatChannels/general/messages/msg_unverified',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: { id: 'msg_unverified', channelId: 'general', content: 'spoof' },
  },
  {
    id: 3,
    name: 'AuthorUid Spoofing on ChatMessage Create',
    targetPath: 'chatChannels/general/messages/msg_spoof',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: { id: 'msg_spoof', channelId: 'general', authorUid: 'victim_uid', content: 'hi' },
  },
  {
    id: 4,
    name: 'Shadow Field Injection (isAdmin: true)',
    targetPath: 'publicProfiles/userA',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: { uid: 'userA', username: 'Alice', isAdmin: true },
  },
  {
    id: 5,
    name: 'Cross-User PII Read on /users/{userId}',
    targetPath: 'users/userB',
    operation: 'get',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Unauthorized Channel ID',
    targetPath: 'chatChannels/evil-room',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: { id: 'evil-room', name: 'evil-room', description: 'bad' },
  },
  {
    id: 7,
    name: 'Orphaned Message Without Channel Parent',
    targetPath: 'chatChannels/missing_room/messages/msg_orphan',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: { id: 'msg_orphan', channelId: 'missing_room', content: 'orphan' },
  },
  {
    id: 8,
    name: 'Oversized / Invalid Path ID Poisoning',
    targetPath: `publicProfiles/${'a!'.repeat(80)}`,
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Forged Client Timestamp',
    targetPath: 'chatChannels/general/messages/msg_clock',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: { id: 'msg_clock', createdAt: '2020-01-01T00:00:00Z' },
  },
  {
    id: 10,
    name: 'Cross-User Message Delete',
    targetPath: 'chatChannels/general/messages/msg_userA',
    operation: 'delete',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Message Content Tampering During Reaction Update',
    targetPath: 'chatChannels/general/messages/msg_userA',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: { reactions: { '❤️': 1 }, content: 'hacked!' },
  },
  {
    id: 12,
    name: 'Unbounded Array Exhaustion on likedTrackIds',
    targetPath: 'users/userA',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: { likedTrackIds: Array.from({ length: 205 }, (_, i) => `track_${i}`) },
  },
];
