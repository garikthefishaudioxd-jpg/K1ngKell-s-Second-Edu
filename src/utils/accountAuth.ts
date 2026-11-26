export interface StoredAccount {
  username: string;
  passwordHash: string;
  salt: string;
  bio?: string;
  avatar?: string;
  createdAt: string;
  updatedAt?: string;
}

const ACCOUNTS_STORAGE_KEY = 'k1ngkell_accounts';
export const SIGNED_IN_USER_KEY = 'k1ngkell_signed_in_user';
export const CHAT_USERNAME_KEY = 'k1ngkell_chat_username';

const DISTINCT_AVATAR_IDS = [
  'preset:arcade',
  'preset:dj',
  'preset:blaze',
  'preset:crown',
  'preset:volt',
  'preset:orbit',
  'preset:phantom',
  'preset:nova',
  'preset:voyager',
  'preset:guardian',
  'preset:starlight',
];

function normalizeKey(username: string): string {
  return username.trim().toLowerCase();
}

export function pickDistinctAvatarForAccount(
  username: string,
  accounts: Record<string, StoredAccount> = loadAccounts()
): string {
  const used = new Set(
    Object.values(accounts)
      .map((a) => a.avatar)
      .filter((a): a is string => Boolean(a && a !== 'initials'))
  );

  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const startIdx = Math.abs(hash) % DISTINCT_AVATAR_IDS.length;

  for (let offset = 0; offset < DISTINCT_AVATAR_IDS.length; offset++) {
    const candidate = DISTINCT_AVATAR_IDS[(startIdx + offset) % DISTINCT_AVATAR_IDS.length];
    if (!used.has(candidate)) {
      return candidate;
    }
  }

  return DISTINCT_AVATAR_IDS[(startIdx + Object.keys(accounts).length) % DISTINCT_AVATAR_IDS.length];
}

function generateSalt(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const input = `${salt}:${password}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoded = new TextEncoder().encode(input);
    const buffer = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback deterministic hash for environments without crypto.subtle
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`;
}

export function loadAccounts(): Record<string, StoredAccount> {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, StoredAccount>;
  } catch {
    return {};
  }
}

function saveAccounts(accounts: Record<string, StoredAccount>): void {
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch {
    // ignore storage quota errors
  }
}

export function hasAnyAccounts(): boolean {
  return Object.keys(loadAccounts()).length > 0;
}

export function getAccount(username: string): StoredAccount | null {
  const accounts = loadAccounts();
  return accounts[normalizeKey(username)] || null;
}

export function setSignedInSession(username: string | null): void {
  try {
    if (username && username.trim()) {
      const clean = username.trim();
      localStorage.setItem(SIGNED_IN_USER_KEY, clean);
      localStorage.setItem(CHAT_USERNAME_KEY, clean);
    } else {
      localStorage.removeItem(SIGNED_IN_USER_KEY);
    }
    localStorage.removeItem('k1ngkell_gate_unlocked');
    localStorage.removeItem('k1ngkell_captcha_verified');
  } catch {
    // ignore storage errors
  }
}

export async function registerAccount(
  username: string,
  password: string,
  preferredAvatar?: string
): Promise<{ ok: true; account: StoredAccount } | { ok: false; error: string }> {
  const cleanName = username.trim().slice(0, 32);
  if (cleanName.length < 2) {
    return { ok: false, error: 'Username must be at least 2 characters.' };
  }
  if (password.length < 4) {
    return { ok: false, error: 'Password must be at least 4 characters.' };
  }

  const accounts = loadAccounts();
  const key = normalizeKey(cleanName);
  if (accounts[key]) {
    return { ok: false, error: `An account named "${accounts[key].username}" already exists. Sign in instead.` };
  }

  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);
  const now = new Date().toISOString();
  const assignedAvatar =
    preferredAvatar && preferredAvatar !== 'initials'
      ? preferredAvatar
      : pickDistinctAvatarForAccount(cleanName, accounts);

  const account: StoredAccount = {
    username: cleanName,
    passwordHash,
    salt,
    bio: '',
    avatar: assignedAvatar,
    createdAt: now,
    updatedAt: now,
  };

  accounts[key] = account;
  saveAccounts(accounts);
  setSignedInSession(account.username);
  return { ok: true, account };
}

export async function authenticateAccount(
  username: string,
  password: string
): Promise<{ ok: true; account: StoredAccount } | { ok: false; error: string }> {
  const cleanName = username.trim().slice(0, 32);
  if (!cleanName) {
    return { ok: false, error: 'Please enter your username.' };
  }
  if (!password) {
    return { ok: false, error: 'Please enter your password.' };
  }

  const accounts = loadAccounts();
  const key = normalizeKey(cleanName);
  const account = accounts[key];

  if (!account) {
    return { ok: false, error: `No account found for "${cleanName}". Switch to Create Account to register.` };
  }

  const attemptHash = await hashPassword(password, account.salt);
  if (attemptHash !== account.passwordHash) {
    return { ok: false, error: 'Incorrect password. Please try again.' };
  }

  if (!account.avatar) {
    account.avatar = pickDistinctAvatarForAccount(account.username, accounts);
    accounts[key] = account;
    saveAccounts(accounts);
  }

  setSignedInSession(account.username);
  return { ok: true, account };
}

export function updateAccountProfile(
  currentUsername: string,
  updates: { newUsername?: string; bio?: string; avatar?: string }
): { ok: true; account: StoredAccount } | { ok: false; error: string } {
  const accounts = loadAccounts();
  const oldKey = normalizeKey(currentUsername);
  const existing = accounts[oldKey];

  const nextName = (updates.newUsername ?? currentUsername).trim().slice(0, 32);
  if (nextName.length < 2) {
    return { ok: false, error: 'Username must be at least 2 characters.' };
  }

  const newKey = normalizeKey(nextName);
  if (newKey !== oldKey && accounts[newKey]) {
    return { ok: false, error: `The username "${accounts[newKey].username}" is already taken.` };
  }

  const now = new Date().toISOString();
  const updatedAccount: StoredAccount = existing
    ? {
        ...existing,
        username: nextName,
        bio: updates.bio !== undefined ? updates.bio.trim().slice(0, 160) : existing.bio,
        avatar: updates.avatar !== undefined ? updates.avatar : existing.avatar,
        updatedAt: now,
      }
    : {
        username: nextName,
        passwordHash: '',
        salt: '',
        bio: updates.bio !== undefined ? updates.bio.trim().slice(0, 160) : '',
        avatar: updates.avatar,
        createdAt: now,
        updatedAt: now,
      };

  if (newKey !== oldKey) {
    delete accounts[oldKey];
  }
  accounts[newKey] = updatedAccount;
  saveAccounts(accounts);
  setSignedInSession(updatedAccount.username);

  return { ok: true, account: updatedAccount };
}

export async function changeAccountPassword(
  username: string,
  currentPassword: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (newPassword.length < 4) {
    return { ok: false, error: 'New password must be at least 4 characters.' };
  }

  const accounts = loadAccounts();
  const key = normalizeKey(username);
  const existing = accounts[key];

  if (existing && existing.passwordHash) {
    if (!currentPassword) {
      return { ok: false, error: 'Please enter your current password.' };
    }
    const checkHash = await hashPassword(currentPassword, existing.salt);
    if (checkHash !== existing.passwordHash) {
      return { ok: false, error: 'Current password is incorrect.' };
    }
  }

  const salt = generateSalt();
  const passwordHash = await hashPassword(newPassword, salt);
  const now = new Date().toISOString();

  accounts[key] = existing
    ? {
        ...existing,
        passwordHash,
        salt,
        updatedAt: now,
      }
    : {
        username: username.trim().slice(0, 32),
        passwordHash,
        salt,
        bio: '',
        createdAt: now,
        updatedAt: now,
      };

  saveAccounts(accounts);
  return { ok: true };
}

export function deleteAccount(username: string): void {
  const accounts = loadAccounts();
  const key = normalizeKey(username);
  if (accounts[key]) {
    delete accounts[key];
    saveAccounts(accounts);
  }
  setSignedInSession(null);
}
