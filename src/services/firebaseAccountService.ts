import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { TrackItem } from '../types';
import {
  getAccountByGoogleUid,
  linkLocalAccountToGoogle,
  pickDistinctAvatarForAccount,
  syncLocalAccountFromGoogle,
} from '../utils/accountAuth';

let pendingGoogleLinkPromise: Promise<unknown> | null = null;

export async function runWithGoogleLinkLock<T>(fn: () => Promise<T>): Promise<T> {
  const task = fn();
  pendingGoogleLinkPromise = task.catch(() => undefined);
  try {
    return await task;
  } finally {
    if (pendingGoogleLinkPromise) {
      pendingGoogleLinkPromise = null;
    }
  }
}

export async function waitForPendingGoogleLink(): Promise<void> {
  if (pendingGoogleLinkPromise) {
    await pendingGoogleLinkPromise;
  }
}

export interface FirebasePublicProfile {
  uid: string;
  username: string;
  bio: string;
  avatar: string;
  online: boolean;
  lastSeenAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface FirebasePrivateAccount {
  uid: string;
  email: string;
  displayName: string;
  likedTrackIds: string[];
  customTracks: TrackItem[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

function sanitizeUsername(raw: string): string {
  const cleaned = raw.trim().slice(0, 32);
  return cleaned.length >= 2 ? cleaned : 'K1ngkellUser';
}

function sanitizeBio(raw: string): string {
  return raw.trim().slice(0, 160);
}

function sanitizeAvatar(raw: string): string {
  return raw.slice(0, 24000);
}

function sanitizeCustomTracks(tracks: TrackItem[]): TrackItem[] {
  return tracks.slice(0, 50).map((t) => ({
    id: String(t.id || `custom-${Date.now()}`).slice(0, 128),
    title: String(t.title || 'Custom Stream').slice(0, 120),
    artist: String(t.artist || 'SoundCloud Artist').slice(0, 80),
    duration: String(t.duration || 'Stream').slice(0, 32),
    genre: String(t.genre || 'User Stream').slice(0, 48),
    embedUrl: String(t.embedUrl || '').slice(0, 1000),
    artwork: String(t.artwork || '').slice(0, 1000),
    isLiked: Boolean(t.isLiked),
  }));
}

export async function syncGoogleUserAccounts(user: User): Promise<{
  publicProfile: FirebasePublicProfile;
  privateAccount: FirebasePrivateAccount;
}> {
  const uid = user.uid;
  const publicPath = `publicProfiles/${uid}`;
  const privatePath = `users/${uid}`;
  const publicRef = doc(db, 'publicProfiles', uid);
  const privateRef = doc(db, 'users', uid);

  let publicProfile: FirebasePublicProfile;
  let privateAccount: FirebasePrivateAccount;

  const linkedLocal = getAccountByGoogleUid(uid);
  const fallbackName = sanitizeUsername(
    linkedLocal?.username || user.displayName || user.email?.split('@')[0] || 'Member'
  );

  try {
    const publicSnap = await getDoc(publicRef);
    if (publicSnap.exists()) {
      const existingData = publicSnap.data() as FirebasePublicProfile;
      await updateDoc(publicRef, {
        online: true,
        lastSeenAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      publicProfile = {
        ...existingData,
        online: true,
      };
    } else {
      const initialAvatar = sanitizeAvatar(
        linkedLocal?.avatar || pickDistinctAvatarForAccount(uid)
      );
      const initialBio = sanitizeBio(linkedLocal?.bio || '');
      const newPublicPayload = {
        uid,
        username: fallbackName,
        bio: initialBio,
        avatar: initialAvatar,
        online: true,
        lastSeenAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(publicRef, newPublicPayload);
      publicProfile = {
        uid,
        username: fallbackName,
        bio: initialBio,
        avatar: initialAvatar,
        online: true,
      };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, publicPath);
  }

  try {
    const privateSnap = await getDoc(privateRef);
    if (privateSnap.exists()) {
      privateAccount = privateSnap.data() as FirebasePrivateAccount;
    } else {
      const email = String(user.email || '').slice(0, 254);
      const displayName = String(user.displayName || fallbackName).slice(0, 64);
      const newPrivatePayload = {
        uid,
        email,
        displayName,
        likedTrackIds: [] as string[],
        customTracks: [] as TrackItem[],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(privateRef, newPrivatePayload);
      privateAccount = {
        uid,
        email,
        displayName,
        likedTrackIds: [],
        customTracks: [],
      };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, privatePath);
  }

  syncLocalAccountFromGoogle({
    googleUid: uid,
    googleEmail: privateAccount.email || user.email || '',
    username: publicProfile.username,
    bio: publicProfile.bio || '',
    avatar: publicProfile.avatar || '',
  });

  return { publicProfile, privateAccount };
}

export async function linkAccountToGoogleInFirestore(
  user: User,
  localData: {
    previousUsername?: string | null;
    username: string;
    bio?: string;
    avatar?: string;
    likedTrackIds?: string[];
    customTracks?: TrackItem[];
  }
): Promise<{
  publicProfile: FirebasePublicProfile;
  privateAccount: FirebasePrivateAccount;
}> {
  const uid = user.uid;
  const publicPath = `publicProfiles/${uid}`;
  const privatePath = `users/${uid}`;
  const publicRef = doc(db, 'publicProfiles', uid);
  const privateRef = doc(db, 'users', uid);

  const cleanUsername = sanitizeUsername(localData.username);
  const cleanBio = sanitizeBio(localData.bio || '');
  const cleanAvatar = sanitizeAvatar(
    localData.avatar && localData.avatar !== 'initials'
      ? localData.avatar
      : pickDistinctAvatarForAccount(cleanUsername)
  );
  const cleanEmail = String(user.email || '').slice(0, 254);

  let publicProfile: FirebasePublicProfile;
  let privateAccount: FirebasePrivateAccount;

  try {
    const publicSnap = await getDoc(publicRef);
    if (publicSnap.exists()) {
      const existing = publicSnap.data() as FirebasePublicProfile;
      await updateDoc(publicRef, {
        username: cleanUsername,
        bio: cleanBio,
        avatar: cleanAvatar,
        online: true,
        lastSeenAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      publicProfile = {
        ...existing,
        username: cleanUsername,
        bio: cleanBio,
        avatar: cleanAvatar,
        online: true,
      };
    } else {
      await setDoc(publicRef, {
        uid,
        username: cleanUsername,
        bio: cleanBio,
        avatar: cleanAvatar,
        online: true,
        lastSeenAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      publicProfile = {
        uid,
        username: cleanUsername,
        bio: cleanBio,
        avatar: cleanAvatar,
        online: true,
      };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, publicPath);
  }

  const incomingLiked = (localData.likedTrackIds || [])
    .slice(0, 200)
    .map((id) => String(id).slice(0, 128));
  const incomingCustom = sanitizeCustomTracks(localData.customTracks || []);

  try {
    const privateSnap = await getDoc(privateRef);
    if (privateSnap.exists()) {
      const existing = privateSnap.data() as FirebasePrivateAccount;
      const mergedLiked = Array.from(
        new Set([...(existing.likedTrackIds || []), ...incomingLiked])
      ).slice(0, 200);

      const customMap = new Map<string, TrackItem>();
      for (const t of existing.customTracks || []) {
        if (t?.id) customMap.set(t.id, t);
      }
      for (const t of incomingCustom) {
        if (t?.id && !customMap.has(t.id)) customMap.set(t.id, t);
      }
      const mergedCustom = sanitizeCustomTracks(Array.from(customMap.values()));

      await updateDoc(privateRef, {
        email: cleanEmail || existing.email || '',
        displayName: cleanUsername.slice(0, 64),
        likedTrackIds: mergedLiked,
        customTracks: mergedCustom,
        updatedAt: serverTimestamp(),
      });
      privateAccount = {
        uid,
        email: cleanEmail || existing.email || '',
        displayName: cleanUsername.slice(0, 64),
        likedTrackIds: mergedLiked,
        customTracks: mergedCustom,
      };
    } else {
      await setDoc(privateRef, {
        uid,
        email: cleanEmail,
        displayName: cleanUsername.slice(0, 64),
        likedTrackIds: incomingLiked,
        customTracks: incomingCustom,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      privateAccount = {
        uid,
        email: cleanEmail,
        displayName: cleanUsername.slice(0, 64),
        likedTrackIds: incomingLiked,
        customTracks: incomingCustom,
      };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, privatePath);
  }

  linkLocalAccountToGoogle(
    localData.previousUsername || cleanUsername,
    uid,
    cleanEmail,
    { bio: cleanBio, avatar: cleanAvatar }
  );

  return { publicProfile, privateAccount };
}

export async function updateFirestorePublicProfile(
  uid: string,
  updates: { username?: string; bio?: string; avatar?: string; online?: boolean }
): Promise<void> {
  const path = `publicProfiles/${uid}`;
  const ref = doc(db, 'publicProfiles', uid);
  const payload: Record<string, unknown> = {
    lastSeenAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (updates.username !== undefined) {
    const cleanName = updates.username.trim().slice(0, 32);
    if (cleanName.length < 2) {
      throw new Error('Username must be at least 2 characters.');
    }
    payload.username = cleanName;
  }
  if (updates.bio !== undefined) {
    payload.bio = sanitizeBio(updates.bio);
  }
  if (updates.avatar !== undefined) {
    payload.avatar = sanitizeAvatar(updates.avatar);
  }
  if (updates.online !== undefined) {
    payload.online = Boolean(updates.online);
  }

  try {
    await updateDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function setFirestorePresenceOffline(uid: string): Promise<void> {
  const path = `publicProfiles/${uid}`;
  try {
    await updateDoc(doc(db, 'publicProfiles', uid), {
      online: false,
      lastSeenAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function getFirestorePrivateAccount(
  uid: string
): Promise<FirebasePrivateAccount | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data() as FirebasePrivateAccount) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function updateFirestoreMusicLibrary(
  uid: string,
  likedTrackIds: string[],
  customTracks: TrackItem[]
): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      likedTrackIds: likedTrackIds.slice(0, 200).map((id) => String(id).slice(0, 128)),
      customTracks: sanitizeCustomTracks(customTracks),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteFirestoreAccount(uid: string): Promise<void> {
  const publicPath = `publicProfiles/${uid}`;
  const privatePath = `users/${uid}`;
  try {
    await deleteDoc(doc(db, 'publicProfiles', uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, publicPath);
  }
  try {
    await deleteDoc(doc(db, 'users', uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, privatePath);
  }
}

export function subscribePublicProfiles(
  onUpdate: (profiles: FirebasePublicProfile[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const path = 'publicProfiles';
  return onSnapshot(
    collection(db, 'publicProfiles'),
    (snapshot) => {
      const profiles = snapshot.docs.map((d) => d.data() as FirebasePublicProfile);
      onUpdate(profiles);
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
