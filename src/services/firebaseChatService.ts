import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { ChatMessage } from '../types';

export const ALLOWED_CHANNEL_META: Record<string, { name: string; description: string }> = {
  general: {
    name: 'general',
    description: 'The main hangout for the K1ngkell community.',
  },
  'gaming-lounge': {
    name: 'gaming-lounge',
    description: 'Discuss browser games, speedruns, and tips.',
  },
  'music-vibes': {
    name: 'music-vibes',
    description: 'Share your favorite SoundCloud tracks and beats.',
  },
  'tech-chat': {
    name: 'tech-chat',
    description: 'Themes, customization, and tools.',
  },
  announcements: {
    name: 'announcements',
    description: 'Community updates and highlights on K1ngkell.',
  },
};

export interface FirestoreTypingDoc {
  uid: string;
  channelId: string;
  username: string;
  isTyping: boolean;
  updatedAt?: { toMillis?: () => number } | null;
}

const ensuredChannels = new Set<string>();

export async function ensureAllChannelsExist(creatorUid: string): Promise<void> {
  for (const chId of Object.keys(ALLOWED_CHANNEL_META)) {
    await ensureChatChannelExists(chId, creatorUid);
  }
}

export async function ensureChatChannelExists(
  channelId: string,
  creatorUid: string
): Promise<void> {
  if (ensuredChannels.has(channelId)) return;
  const meta = ALLOWED_CHANNEL_META[channelId];
  if (!meta) return;

  const path = `chatChannels/${channelId}`;
  const ref = doc(db, 'chatChannels', channelId);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        id: channelId,
        name: meta.name.slice(0, 32),
        description: meta.description.slice(0, 200),
        createdBy: creatorUid,
        createdAt: serverTimestamp(),
      });
    }
    ensuredChannels.add(channelId);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeChannelMessages(
  channelId: string,
  onMessages: (messages: ChatMessage[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const path = `chatChannels/${channelId}/messages`;
  const q = query(
    collection(db, 'chatChannels', channelId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(200)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const msgs: ChatMessage[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: String(data.id || d.id),
          author: String(data.author || 'Member'),
          clientId: String(data.authorUid || ''),
          avatar: String(data.avatar || ''),
          content: String(data.content || ''),
          timestamp: String(data.timestamp || 'Just now'),
          role: 'user',
          reactions:
            data.reactions && typeof data.reactions === 'object'
              ? (data.reactions as Record<string, number>)
              : {},
        };
      });
      onMessages(msgs);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError) onError(wrapped as Error);
      }
    }
  );
}

export async function sendFirestoreMessage(params: {
  channelId: string;
  authorUid: string;
  author: string;
  avatar: string;
  content: string;
  timestamp: string;
}): Promise<void> {
  const { channelId, authorUid, author, avatar, content, timestamp } = params;
  await ensureChatChannelExists(channelId, authorUid);

  const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const path = `chatChannels/${channelId}/messages/${messageId}`;
  try {
    await setDoc(doc(db, 'chatChannels', channelId, 'messages', messageId), {
      id: messageId,
      channelId,
      authorUid,
      author: author.trim().slice(0, 32) || 'Member',
      avatar: avatar.slice(0, 24000),
      content: content.trim().slice(0, 2000),
      timestamp: timestamp.slice(0, 40) || 'Just now',
      reactions: {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function reactFirestoreMessage(
  channelId: string,
  messageId: string,
  currentReactions: Record<string, number>,
  emoji: string
): Promise<void> {
  const path = `chatChannels/${channelId}/messages/${messageId}`;
  const cleanEmoji = emoji.trim().slice(0, 8);
  if (!cleanEmoji) return;

  const nextReactions: Record<string, number> = { ...currentReactions };
  if (
    !(cleanEmoji in nextReactions) &&
    Object.keys(nextReactions).length >= 10
  ) {
    return;
  }
  nextReactions[cleanEmoji] = (nextReactions[cleanEmoji] || 0) + 1;

  try {
    await updateDoc(doc(db, 'chatChannels', channelId, 'messages', messageId), {
      reactions: nextReactions,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteFirestoreMessage(
  channelId: string,
  messageId: string
): Promise<void> {
  const path = `chatChannels/${channelId}/messages/${messageId}`;
  try {
    await deleteDoc(doc(db, 'chatChannels', channelId, 'messages', messageId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function updateFirestoreMessage(params: {
  channelId: string;
  messageId: string;
  authorUid: string;
  avatar: string;
  content: string;
}): Promise<void> {
  const { channelId, messageId, authorUid, avatar, content } = params;
  await ensureChatChannelExists(channelId, authorUid);

  const path = `chatChannels/${channelId}/messages/${messageId}`;
  try {
    await updateDoc(doc(db, 'chatChannels', channelId, 'messages', messageId), {
      content: content.trim().slice(0, 2000),
      avatar: avatar.slice(0, 24000),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeChannelTyping(
  channelId: string,
  onTyping: (typers: FirestoreTypingDoc[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const path = `chatChannels/${channelId}/typing`;
  return onSnapshot(
    collection(db, 'chatChannels', channelId, 'typing'),
    (snapshot) => {
      const typers = snapshot.docs.map((d) => d.data() as FirestoreTypingDoc);
      onTyping(typers);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError) onError(wrapped as Error);
      }
    }
  );
}

export async function setFirestoreTypingStatus(params: {
  channelId: string;
  uid: string;
  username: string;
  isTyping: boolean;
}): Promise<void> {
  const { channelId, uid, username, isTyping } = params;
  const path = `chatChannels/${channelId}/typing/${uid}`;

  try {
    if (!isTyping) {
      await deleteDoc(doc(db, 'chatChannels', channelId, 'typing', uid));
      return;
    }
    await ensureChatChannelExists(channelId, uid);
    await setDoc(doc(db, 'chatChannels', channelId, 'typing', uid), {
      uid,
      channelId,
      username: username.trim().slice(0, 32) || 'Member',
      isTyping: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
