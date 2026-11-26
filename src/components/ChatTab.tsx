import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChatMessage } from '../types';
import { Hash, Send, Users, Edit2, Check, Trash2, MessageSquare, Lock, LogIn, Sparkles } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { loadAccounts } from '../utils/accountAuth';

interface Channel {
  id: string;
  name: string;
  description: string;
}

interface OnlineUser {
  clientId: string;
  username: string;
  avatar?: string;
}

const CHANNELS: Channel[] = [
  { id: 'general', name: 'general', description: 'The main hangout for the K1ngkell community.' },
  { id: 'gaming-lounge', name: 'gaming-lounge', description: 'Discuss browser games, speedruns, and tips.' },
  { id: 'music-vibes', name: 'music-vibes', description: 'Share your favorite SoundCloud tracks and beats.' },
  { id: 'tech-chat', name: 'tech-chat', description: 'Themes, customization, and tools.' },
  { id: 'announcements', name: 'announcements', description: 'Community updates and highlights on K1ngkell.' },
];

const CHAT_MESSAGES_STORAGE_KEY = 'k1ngkell_chat_messages';
const CHAT_USERNAME_STORAGE_KEY = 'k1ngkell_chat_username';
const CHAT_CLIENT_ID_STORAGE_KEY = 'k1ngkell_chat_client_id';
const CHAT_CHANNEL_STORAGE_KEY = 'k1ngkell_chat_active_channel';

function getOrCreateClientId(accountUsername?: string | null): string {
  const key = accountUsername?.trim()
    ? `${CHAT_CLIENT_ID_STORAGE_KEY}_${accountUsername.trim().toLowerCase()}`
    : CHAT_CLIENT_ID_STORAGE_KEY;
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const generated = `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  localStorage.setItem(key, generated);
  return generated;
}

function getOrCreateUsername(clientId: string): string {
  const existing = localStorage.getItem(CHAT_USERNAME_STORAGE_KEY);
  if (existing && existing.trim()) return existing.trim();
  const suffix = clientId.slice(-4).toUpperCase();
  const fallback = `Member-${suffix}`;
  localStorage.setItem(CHAT_USERNAME_STORAGE_KEY, fallback);
  return fallback;
}

function loadSavedMessages(): Record<string, ChatMessage[]> {
  try {
    const raw = localStorage.getItem(CHAT_MESSAGES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const sanitized: Record<string, ChatMessage[]> = {};
    for (const [ch, list] of Object.entries(parsed)) {
      if (Array.isArray(list)) {
        sanitized[ch] = list.filter(
          (m): m is ChatMessage =>
            Boolean(m) &&
            typeof m === 'object' &&
            typeof m.id === 'string' &&
            typeof m.content === 'string' &&
            String((m as { role?: unknown }).role ?? '') !== 'bot'
        );
      }
    }
    return sanitized;
  } catch {
    return {};
  }
}

interface ChatTabProps {
  isSignedIn: boolean;
  signedInUsername: string | null;
  userAvatar: string;
  onRequireSignIn: () => void;
  onOpenAvatarSettings?: () => void;
}

export const ChatTab: React.FC<ChatTabProps> = ({
  isSignedIn,
  signedInUsername,
  userAvatar,
  onRequireSignIn,
  onOpenAvatarSettings,
}) => {
  const clientId = useMemo(() => getOrCreateClientId(signedInUsername), [signedInUsername]);
  const [username, setUsername] = useState<string>(
    () => signedInUsername || getOrCreateUsername(clientId)
  );
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(username);

  useEffect(() => {
    if (signedInUsername && signedInUsername.trim()) {
      setUsername(signedInUsername.trim());
      setNameDraft(signedInUsername.trim());
    }
  }, [signedInUsername]);

  const [selectedChannel, setSelectedChannel] = useState<string>(() => {
    const saved = localStorage.getItem(CHAT_CHANNEL_STORAGE_KEY);
    return saved && CHANNELS.some((c) => c.id === saved) ? saved : 'general';
  });
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>(() =>
    loadSavedMessages()
  );
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([
    { clientId, username, avatar: userAvatar },
  ]);
  const [serverOfflineUsers, setServerOfflineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    setOnlineUsers([{ clientId, username, avatar: userAvatar }]);
  }, [clientId]);
  const [inputText, setInputText] = useState('');
  const [showMembers, setShowMembers] = useState(true);
  const [typingUsersByChannel, setTypingUsersByChannel] = useState<
    Record<string, Record<string, { username: string; updatedAt: number }>>
  >({});

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const broadcastRef = useRef<BroadcastChannel | null>(null);
  const typingStopTimerRef = useRef<number | null>(null);
  const lastTypingSentAtRef = useRef<number>(0);
  const isCurrentlyTypingRef = useRef<boolean>(false);
  const previousChannelRef = useRef<string>(selectedChannel);

  const activeChannelObj =
    CHANNELS.find((c) => c.id === selectedChannel) || CHANNELS[0];
  const channelMessages = messages[selectedChannel] || [];

  useEffect(() => {
    localStorage.setItem(CHAT_CHANNEL_STORAGE_KEY, selectedChannel);
  }, [selectedChannel]);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_MESSAGES_STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Ignore storage quota errors
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [channelMessages.length, selectedChannel]);

  // Connect to live server chat stream when signed in, with BroadcastChannel + storage sync fallback
  useEffect(() => {
    if (!isSignedIn) return;
    let eventSource: EventSource | null = null;
    let cancelled = false;

    const connectStream = async () => {
      try {
        const res = await fetch('/api/chat');
        const ct = res.headers.get('content-type') || '';
        if (!res.ok || !ct.includes('application/json') || cancelled) {
          return;
        }
        const data = await res.json();
        if (data?.channels && typeof data.channels === 'object') {
          setMessages(data.channels);
        }
        if (Array.isArray(data?.onlineUsers) && data.onlineUsers.length > 0) {
          setOnlineUsers(data.onlineUsers);
        }
        if (Array.isArray(data?.offlineUsers)) {
          setServerOfflineUsers(data.offlineUsers);
        }

        const presetParam = userAvatar && !userAvatar.startsWith('data:') ? `&avatar=${encodeURIComponent(userAvatar)}` : '';
        const streamUrl = `/api/chat/stream?clientId=${encodeURIComponent(
          clientId
        )}&username=${encodeURIComponent(username)}${presetParam}`;
        eventSource = new EventSource(streamUrl);
        eventSource.onmessage = (evt) => {
          try {
            const payload = JSON.parse(evt.data);
            if (payload.type === 'init') {
              if (payload.channels && typeof payload.channels === 'object') {
                setMessages(payload.channels);
              }
              if (Array.isArray(payload.onlineUsers)) {
                setOnlineUsers(payload.onlineUsers);
              }
              if (Array.isArray(payload.offlineUsers)) {
                setServerOfflineUsers(payload.offlineUsers);
              }
            } else if (payload.type === 'presence:update' && Array.isArray(payload.onlineUsers)) {
              setOnlineUsers(payload.onlineUsers);
              if (Array.isArray(payload.offlineUsers)) {
                setServerOfflineUsers(payload.offlineUsers);
              }
            } else if (payload.type === 'message:created' && payload.channelId && payload.message) {
              setMessages((prev) => {
                const list = prev[payload.channelId] || [];
                if (list.some((m) => m.id === payload.message.id)) return prev;
                return { ...prev, [payload.channelId]: [...list, payload.message] };
              });
            } else if (payload.type === 'message:updated' && payload.channelId && payload.message) {
              setMessages((prev) => {
                const list = prev[payload.channelId] || [];
                return {
                  ...prev,
                  [payload.channelId]: list.map((m) =>
                    m.id === payload.message.id ? payload.message : m
                  ),
                };
              });
            } else if (payload.type === 'message:deleted' && payload.channelId && payload.messageId) {
              setMessages((prev) => {
                const list = prev[payload.channelId] || [];
                return {
                  ...prev,
                  [payload.channelId]: list.filter((m) => m.id !== payload.messageId),
                };
              });
            } else if (
              payload.type === 'typing:update' &&
              payload.channelId &&
              payload.clientId &&
              payload.clientId !== clientId
            ) {
              setTypingUsersByChannel((prev) => {
                const channelMap = { ...(prev[payload.channelId] || {}) };
                if (payload.isTyping) {
                  channelMap[payload.clientId] = {
                    username: String(payload.username || 'Someone'),
                    updatedAt: Date.now(),
                  };
                } else {
                  delete channelMap[payload.clientId];
                }
                return { ...prev, [payload.channelId]: channelMap };
              });
            } else if (payload.type === 'typing:clear' && payload.clientId) {
              setTypingUsersByChannel((prev) => {
                let changed = false;
                const next: typeof prev = {};
                for (const [chId, chMap] of Object.entries(prev)) {
                  if (chMap[payload.clientId]) {
                    changed = true;
                    const copy = { ...chMap };
                    delete copy[payload.clientId];
                    next[chId] = copy;
                  } else {
                    next[chId] = chMap;
                  }
                }
                return changed ? next : prev;
              });
            }
          } catch {
            // Ignore malformed SSE event
          }
        };
      } catch {
        // Static host mode uses localStorage + BroadcastChannel
      }
    };

    connectStream();

    return () => {
      cancelled = true;
      eventSource?.close();
    };
  }, [clientId, username, isSignedIn]);

  // Broadcast avatar/username presence updates to live chat room
  useEffect(() => {
    if (!isSignedIn) return;
    setOnlineUsers((prev) =>
      prev.map((u) => (u.clientId === clientId ? { ...u, username, avatar: userAvatar } : u))
    );
    fetch('/api/chat/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, username, avatar: userAvatar }),
    }).catch(() => {
      // Static mode uses local state
    });
  }, [isSignedIn, clientId, username, userAvatar]);

  // Cross-tab instant synchronization via BroadcastChannel & storage event
  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('k1ngkell_chat');
      broadcastRef.current = bc;
      bc.onmessage = (e) => {
        if (e.data?.type === 'sync' && e.data.messages) {
          setMessages(e.data.messages);
        } else if (
          e.data?.type === 'typing' &&
          e.data.channelId &&
          e.data.clientId &&
          e.data.clientId !== clientId
        ) {
          setTypingUsersByChannel((prev) => {
            const channelMap = { ...(prev[e.data.channelId] || {}) };
            if (e.data.isTyping) {
              channelMap[e.data.clientId] = {
                username: String(e.data.username || 'Someone'),
                updatedAt: Date.now(),
              };
            } else {
              delete channelMap[e.data.clientId];
            }
            return { ...prev, [e.data.channelId]: channelMap };
          });
        }
      };
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === CHAT_MESSAGES_STORAGE_KEY && e.newValue) {
        setMessages(loadSavedMessages());
      }
    };
    window.addEventListener('storage', handleStorage);

    const pruneTimer = window.setInterval(() => {
      const now = Date.now();
      setTypingUsersByChannel((prev) => {
        let changed = false;
        const next: typeof prev = {};
        for (const [chId, chMap] of Object.entries(prev)) {
          const filtered: Record<string, { username: string; updatedAt: number }> = {};
          for (const [cid, info] of Object.entries(chMap)) {
            if (now - info.updatedAt <= 4500) {
              filtered[cid] = info;
            } else {
              changed = true;
            }
          }
          next[chId] = filtered;
        }
        return changed ? next : prev;
      });
    }, 1500);

    return () => {
      broadcastRef.current?.close();
      broadcastRef.current = null;
      window.removeEventListener('storage', handleStorage);
      window.clearInterval(pruneTimer);
    };
  }, [clientId]);

  const sendTypingSignal = (channelId: string, isTyping: boolean) => {
    isCurrentlyTypingRef.current = isTyping;
    if (isTyping) {
      lastTypingSentAtRef.current = Date.now();
    } else {
      lastTypingSentAtRef.current = 0;
    }

    broadcastRef.current?.postMessage({
      type: 'typing',
      channelId,
      clientId,
      username,
      isTyping,
    });

    fetch('/api/chat/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId, clientId, username, isTyping }),
    }).catch(() => {
      // Static hosting uses BroadcastChannel
    });
  };

  useEffect(() => {
    const prevChannel = previousChannelRef.current;
    if (prevChannel !== selectedChannel && isCurrentlyTypingRef.current) {
      if (typingStopTimerRef.current) {
        window.clearTimeout(typingStopTimerRef.current);
        typingStopTimerRef.current = null;
      }
      sendTypingSignal(prevChannel, false);
    }
    previousChannelRef.current = selectedChannel;
  }, [selectedChannel]);

  useEffect(() => {
    return () => {
      if (typingStopTimerRef.current) {
        window.clearTimeout(typingStopTimerRef.current);
      }
      if (isCurrentlyTypingRef.current) {
        sendTypingSignal(previousChannelRef.current, false);
      }
    };
  }, [clientId]);

  const handleInputChange = (value: string) => {
    setInputText(value);
    if (!isSignedIn) return;

    if (!value.trim()) {
      if (typingStopTimerRef.current) {
        window.clearTimeout(typingStopTimerRef.current);
        typingStopTimerRef.current = null;
      }
      if (isCurrentlyTypingRef.current) {
        sendTypingSignal(selectedChannel, false);
      }
      return;
    }

    const now = Date.now();
    if (!isCurrentlyTypingRef.current || now - lastTypingSentAtRef.current >= 2000) {
      sendTypingSignal(selectedChannel, true);
    }

    if (typingStopTimerRef.current) {
      window.clearTimeout(typingStopTimerRef.current);
    }
    typingStopTimerRef.current = window.setTimeout(() => {
      if (isCurrentlyTypingRef.current) {
        sendTypingSignal(selectedChannel, false);
      }
    }, 2500);
  };

  const syncLocalBroadcast = (nextMessages: Record<string, ChatMessage[]>) => {
    broadcastRef.current?.postMessage({ type: 'sync', messages: nextMessages });
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = nameDraft.trim().slice(0, 32);
    if (!cleaned) return;
    setUsername(cleaned);
    localStorage.setItem(CHAT_USERNAME_STORAGE_KEY, cleaned);
    setOnlineUsers((prev) =>
      prev.map((u) => (u.clientId === clientId ? { ...u, username: cleaned } : u))
    );
    setIsEditingName(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    const currentChannel = selectedChannel;
    const formattedTime = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date());

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      author: username,
      clientId,
      avatar: userAvatar,
      content: text,
      timestamp: formattedTime,
      role: 'user',
      reactions: {},
    };

    setInputText('');
    if (typingStopTimerRef.current) {
      window.clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = null;
    }
    if (isCurrentlyTypingRef.current) {
      sendTypingSignal(currentChannel, false);
    }

    setMessages((prev) => {
      const list = prev[currentChannel] || [];
      if (list.some((m) => m.id === newMsg.id)) return prev;
      const next = { ...prev, [currentChannel]: [...list, newMsg] };
      syncLocalBroadcast(next);
      return next;
    });

    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: currentChannel, message: newMsg }),
      });
    } catch {
      // Saved locally in localStorage for static hosting
    }
  };

  const handleReact = async (msgId: string, emoji: string) => {
    const currentChannel = selectedChannel;
    setMessages((prev) => {
      const list = prev[currentChannel] || [];
      const updated = list.map((m) => {
        if (m.id !== msgId) return m;
        const currentReactions = { ...(m.reactions || {}) };
        currentReactions[emoji] = (currentReactions[emoji] || 0) + 1;
        return { ...m, reactions: currentReactions };
      });
      const next = { ...prev, [currentChannel]: updated };
      syncLocalBroadcast(next);
      return next;
    });

    try {
      await fetch('/api/chat/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: currentChannel, messageId: msgId, emoji }),
      });
    } catch {
      // Saved locally
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    const currentChannel = selectedChannel;
    setMessages((prev) => {
      const list = prev[currentChannel] || [];
      const next = {
        ...prev,
        [currentChannel]: list.filter((m) => m.id !== msgId),
      };
      syncLocalBroadcast(next);
      return next;
    });

    try {
      await fetch('/api/chat', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: currentChannel, messageId: msgId, clientId }),
      });
    } catch {
      // Deleted locally
    }
  };

  const displayMembers = useMemo(() => {
    const map = new Map<string, OnlineUser>();
    onlineUsers.forEach((u) => map.set(u.clientId, u));
    map.set(clientId, { clientId, username, avatar: userAvatar });
    return Array.from(map.values());
  }, [onlineUsers, clientId, username, userAvatar]);

  const offlineMembers = useMemo(() => {
    const onlineIds = new Set(displayMembers.map((u) => u.clientId.toLowerCase()));
    const onlineNames = new Set(displayMembers.map((u) => u.username.trim().toLowerCase()));
    const map = new Map<string, OnlineUser>();

    const addCandidate = (candidate: OnlineUser) => {
      const nameKey = candidate.username.trim().toLowerCase();
      const idKey = candidate.clientId.toLowerCase();
      if (!nameKey || onlineIds.has(idKey) || onlineNames.has(nameKey)) return;
      const existing = map.get(nameKey);
      if (!existing || (!existing.avatar && candidate.avatar)) {
        map.set(nameKey, candidate);
      }
    };

    serverOfflineUsers.forEach(addCandidate);

    for (const list of Object.values(messages)) {
      for (const msg of list) {
        if (msg && msg.author && String((msg as { role?: unknown }).role ?? '') !== 'bot') {
          addCandidate({
            clientId: msg.clientId || `author-${msg.author.toLowerCase()}`,
            username: msg.author,
            avatar: msg.avatar,
          });
        }
      }
    }

    const localAccounts = loadAccounts();
    for (const acct of Object.values(localAccounts)) {
      if (acct?.username) {
        addCandidate({
          clientId: `account-${acct.username.trim().toLowerCase()}`,
          username: acct.username,
          avatar: acct.avatar,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.username.localeCompare(b.username));
  }, [displayMembers, serverOfflineUsers, messages]);

  const activeChannelTypers = useMemo(() => {
    const channelMap = typingUsersByChannel[selectedChannel] || {};
    return Object.entries(channelMap)
      .filter(([cid]) => cid !== clientId)
      .map(([, info]) => info.username);
  }, [typingUsersByChannel, selectedChannel, clientId]);

  const typingIndicatorText = useMemo(() => {
    if (activeChannelTypers.length === 0) return '';
    if (activeChannelTypers.length === 1) {
      return `${activeChannelTypers[0]} is typing...`;
    }
    if (activeChannelTypers.length === 2) {
      return `${activeChannelTypers[0]} and ${activeChannelTypers[1]} are typing...`;
    }
    return `${activeChannelTypers[0]}, ${activeChannelTypers[1]}, and ${activeChannelTypers.length - 2} other${
      activeChannelTypers.length - 2 > 1 ? 's' : ''
    } are typing...`;
  }, [activeChannelTypers]);

  if (!isSignedIn) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="p-8 sm:p-10 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-2xl text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-xl font-black text-white">
              Sign In Required to Access Chat
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              You are currently signed out. Sign in with a username to view channels, send messages, and react with others.
            </p>
          </div>
          <button
            type="button"
            onClick={onRequireSignIn}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-blue-600 hover:from-rose-700 hover:to-blue-700 text-white text-xs font-bold shadow-md transition-all"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In to Chat</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 h-[calc(100vh-6rem)] min-h-[600px] flex flex-col">
      <div className="flex-1 flex overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100">
        {/* Discord Channels Sidebar */}
        <div className="w-56 sm:w-64 bg-slate-950 flex flex-col border-r border-slate-800/80 shrink-0">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="font-black text-sm tracking-tight text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>K1ngkell Chat</span>
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Text Channels
            </div>
            {CHANNELS.map((ch) => {
              const isActive = ch.id === selectedChannel;
              const count = (messages[ch.id] || []).length;
              return (
                <button
                  key={ch.id}
                  onClick={() => setSelectedChannel(ch.id)}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Hash className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="truncate">{ch.name}</span>
                  </span>
                  {count > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 shrink-0">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Current User Profile Bar with Editable Name */}
          <div className="p-3 bg-slate-900/90 border-t border-slate-800">
            {isEditingName ? (
              <form onSubmit={handleSaveName} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  maxLength={32}
                  autoFocus
                  placeholder="Display name"
                  className="flex-1 min-w-0 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                />
                <button
                  type="submit"
                  title="Save name"
                  className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={onOpenAvatarSettings}
                    title="Change Avatar in Settings"
                    className="relative shrink-0 group cursor-pointer"
                  >
                    <UserAvatar
                      avatar={userAvatar}
                      name={username}
                      size="md"
                      className="group-hover:ring-2 group-hover:ring-rose-500 transition-all"
                    />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
                  </button>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{username}</div>
                    <div className="text-[10px] text-emerald-400 truncate">Online</div>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  {onOpenAvatarSettings && (
                    <button
                      type="button"
                      onClick={onOpenAvatarSettings}
                      title="Customize Avatar"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setNameDraft(username);
                      setIsEditingName(true);
                    }}
                    title="Change display name"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center Chat Viewport */}
        <div className="flex-1 flex flex-col bg-slate-900 min-w-0">
          {/* Channel Header Bar */}
          <div className="h-14 px-4 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Hash className="w-5 h-5 text-slate-400 shrink-0" />
              <h3 className="font-bold text-sm text-white truncate">
                {activeChannelObj.name}
              </h3>
              <span className="hidden sm:inline text-xs text-slate-500 border-l border-slate-700 pl-2 ml-1 truncate">
                {activeChannelObj.description}
              </span>
            </div>

            <button
              onClick={() => setShowMembers(!showMembers)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
              title="Toggle Member List"
            >
              <Users className="w-4 h-4" />
            </button>
          </div>

          {/* Chat Messages List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {channelMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <p className="text-sm font-bold text-white">
                    No messages in #{activeChannelObj.name} yet
                  </p>
                  <p className="text-xs text-slate-400">
                    Send a message below to start the conversation. Everything you post is saved automatically.
                  </p>
                </div>
              </div>
            ) : (
              channelMessages.map((msg) => {
                const isOwn = msg.clientId === clientId;
                const resolvedAvatar = isOwn ? userAvatar || msg.avatar : msg.avatar;
                return (
                  <div key={msg.id} className="flex items-start gap-3 group">
                    <UserAvatar
                      avatar={resolvedAvatar}
                      name={msg.author}
                      size="lg"
                      className="mt-0.5 shadow-xs"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white">
                          {msg.author}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {msg.timestamp}
                        </span>
                        {isOwn && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg.id)}
                            title="Delete message"
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-rose-400 transition-opacity ml-auto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-slate-200 mt-1 leading-relaxed break-words whitespace-pre-wrap">
                        {msg.content}
                      </p>

                      {/* Reaction chips */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {Object.entries(msg.reactions || {}).map(([emoji, count]) => (
                          <button
                            key={emoji}
                            onClick={() => handleReact(msg.id, emoji)}
                            className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 flex items-center gap-1 transition-colors"
                          >
                            <span>{emoji}</span>
                            <span className="text-[10px] font-mono">{count}</span>
                          </button>
                        ))}
                        <button
                          onClick={() => handleReact(msg.id, '❤️')}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-800 rounded text-xs transition-opacity"
                        >
                          ❤️
                        </button>
                        <button
                          onClick={() => handleReact(msg.id, '🔥')}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-800 rounded text-xs transition-opacity"
                        >
                          🔥
                        </button>
                        <button
                          onClick={() => handleReact(msg.id, '👍')}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-800 rounded text-xs transition-opacity"
                        >
                          👍
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Typing Indicator & Discord Input Box */}
          <div className="px-4 pt-2 pb-4 bg-slate-900 border-t border-slate-800 space-y-1.5">
            <div className="min-h-[18px] flex items-center px-1">
              {typingIndicatorText && (
                <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
                  <span className="inline-flex items-center gap-0.5" aria-hidden="true">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-bounce" />
                  </span>
                  <span>{typingIndicatorText}</span>
                </div>
              )}
            </div>
            <form
              onSubmit={handleSendMessage}
              className="flex items-center gap-2 bg-slate-800/90 rounded-xl px-4 py-2 border border-slate-700/80 focus-within:ring-2 focus-within:ring-rose-500 transition-all"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder={`Message #${activeChannelObj.name} as ${username}...`}
                className="w-full bg-transparent text-xs text-white placeholder-slate-400 focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-40 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Online & Offline Members Column (Real Users Only) */}
        {showMembers && (
          <div className="w-48 bg-slate-950/70 border-l border-slate-800/80 p-3 hidden lg:flex flex-col overflow-y-auto">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Online — {displayMembers.length}
            </div>
            <div className="space-y-2">
              {displayMembers.map((m) => (
                <div
                  key={m.clientId}
                  className="flex items-center gap-2 py-1 px-1.5 rounded-lg hover:bg-slate-900"
                >
                  <div className="relative shrink-0">
                    <UserAvatar
                      avatar={m.clientId === clientId ? userAvatar : m.avatar}
                      name={m.username}
                      size="sm"
                    />
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full ring-2 ring-slate-950 bg-emerald-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-200 truncate">
                      {m.username}
                      {m.clientId === clientId ? ' (You)' : ''}
                    </div>
                    <div className="text-[10px] text-slate-500">Online</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-5 mb-2 pt-3 border-t border-slate-800/80">
              Offline — {offlineMembers.length}
            </div>
            {offlineMembers.length === 0 ? (
              <div className="px-1.5 py-2 text-[11px] text-slate-600">
                No offline members
              </div>
            ) : (
              <div className="space-y-2">
                {offlineMembers.map((m) => (
                  <div
                    key={m.clientId}
                    className="flex items-center gap-2 py-1 px-1.5 rounded-lg hover:bg-slate-900/70 opacity-65 hover:opacity-90 transition-opacity"
                  >
                    <div className="relative shrink-0">
                      <UserAvatar
                        avatar={m.avatar}
                        name={m.username}
                        size="sm"
                        className="grayscale-[35%]"
                      />
                      <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full ring-2 ring-slate-950 bg-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-400 truncate">
                        {m.username}
                      </div>
                      <div className="text-[10px] text-slate-600">Offline</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
