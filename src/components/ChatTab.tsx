import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { Hash, Send, Smile, Users, Crown, Bot, Sparkles, Pin, Search } from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  description: string;
}

const CHANNELS: Channel[] = [
  { id: 'general', name: 'general', description: 'The main hangout for the K1ngkell community.' },
  { id: 'gaming-lounge', name: 'gaming-lounge', description: 'Discuss unblocked games, speedruns, and tips.' },
  { id: 'music-vibes', name: 'music-vibes', description: 'Share your favorite SoundCloud tracks and beats.' },
  { id: 'tech-chat', name: 'tech-chat', description: 'Themes, customization, and cloud synchronization.' },
  { id: 'announcements', name: 'announcements', description: 'Official updates and new features on K1ngkell.' },
];

const INITIAL_MESSAGES: Record<string, ChatMessage[]> = {
  general: [
    {
      id: 'm-1',
      author: 'K1ngkell Bot',
      avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
      content: 'Welcome to the official K1ngkell Discord lounge! Feel free to chill, stream music, and find games.',
      timestamp: 'Today at 12:00 PM',
      role: 'bot',
      reactions: { '🔥': 4, '👑': 3 },
    },
    {
      id: 'm-2',
      author: 'AeroStrike',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      content: 'The new sunny hill theme with wildflowers looks so good on high DPI screens!',
      timestamp: 'Today at 12:15 PM',
      role: 'user',
      reactions: { '❤️': 2 },
    },
  ],
  'gaming-lounge': [
    {
      id: 'm-g1',
      author: 'CyberKnight',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80',
      content: 'Who can beat my high score in GN Math formula rush? I just hit 240 points!',
      timestamp: 'Today at 1:04 PM',
      role: 'user',
      reactions: { '🎮': 5 },
    },
  ],
  'music-vibes': [
    {
      id: 'm-mu1',
      author: 'K1ngkell Sound Lab',
      avatar: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&auto=format&fit=crop&q=80',
      content: 'Listening to the Lo-Fi hip hop radio stream right now. Perfect for deep focus.',
      timestamp: 'Today at 11:30 AM',
      role: 'mod',
      reactions: { '🎵': 7 },
    },
  ],
  'tech-chat': [
    {
      id: 'm-t1',
      author: 'HexMaster',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      content: 'The encrypted local storage snapshot feature allows syncing theme settings across tabs flawlessly.',
      timestamp: 'Yesterday at 8:40 PM',
      role: 'user',
    },
  ],
  announcements: [
    {
      id: 'm-a1',
      author: 'K1ngkell Admin',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      content: 'Release v3.0 is live! Featuring full SoundCloud stream integration, legal cinema player, and smart human captcha protection.',
      timestamp: 'Today at 9:00 AM',
      role: 'mod',
      reactions: { '🚀': 12, '🎉': 8 },
    },
  ],
};

const ONLINE_MEMBERS = [
  { name: 'K1ngkell Admin', role: 'admin', status: 'online', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100' },
  { name: 'K1ngkell Bot', role: 'bot', status: 'online', avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100' },
  { name: 'AeroStrike', role: 'member', status: 'idle', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100' },
  { name: 'CyberKnight', role: 'member', status: 'online', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100' },
  { name: 'PixelSamurai', role: 'member', status: 'dnd', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' },
];

export const ChatTab: React.FC = () => {
  const [selectedChannel, setSelectedChannel] = useState<string>('general');
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [showMembers, setShowMembers] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeChannelObj = CHANNELS.find((c) => c.id === selectedChannel) || CHANNELS[0];
  const channelMessages = messages[selectedChannel] || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [channelMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      author: 'You (K1ngkell User)',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      content: inputText.trim(),
      timestamp: 'Just now',
      role: 'user',
      reactions: {},
    };

    const currentChannel = selectedChannel;
    setMessages((prev) => ({
      ...prev,
      [currentChannel]: [...(prev[currentChannel] || []), newMsg],
    }));
    setInputText('');

    // Simulated Discord Bot reply if commanded
    if (inputText.startsWith('!')) {
      setTimeout(() => {
        let reply = 'Command received! Try !help, !game, or !music.';
        if (inputText.startsWith('!help')) reply = 'Available commands: !game (suggests random unblocked game), !music (SoundCloud tracks), !ping (checks network).';
        if (inputText.startsWith('!game')) reply = 'Game Recommendation: Try "GN Math: Speed Formula" or "2048 Classic Master"!';
        if (inputText.startsWith('!music')) reply = 'Music Recommendation: Lo-Fi Hip Hop Radio stream in the Music tab.';

        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          author: 'K1ngkell Bot',
          avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
          content: reply,
          timestamp: 'Just now',
          role: 'bot',
        };
        setMessages((prev) => ({
          ...prev,
          [currentChannel]: [...(prev[currentChannel] || []), botMsg],
        }));
      }, 700);
    }
  };

  const handleReact = (msgId: string, emoji: string) => {
    setMessages((prev) => {
      const list = prev[selectedChannel] || [];
      const updated = list.map((m) => {
        if (m.id !== msgId) return m;
        const currentReactions = { ...(m.reactions || {}) };
        currentReactions[emoji] = (currentReactions[emoji] || 0) + 1;
        return { ...m, reactions: currentReactions };
      });
      return { ...prev, [selectedChannel]: updated };
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 h-[calc(100vh-6rem)] min-h-[600px] flex flex-col">
      <div className="flex-1 flex overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100">
        {/* Discord Channels Sidebar */}
        <div className="w-56 sm:w-64 bg-slate-950 flex flex-col border-r border-slate-800/80 shrink-0">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="font-black text-sm tracking-tight text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>K1ngkell Discord</span>
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Text Channels
            </div>
            {CHANNELS.map((ch) => {
              const isActive = ch.id === selectedChannel;
              return (
                <button
                  key={ch.id}
                  onClick={() => setSelectedChannel(ch.id)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Hash className="w-4 h-4 text-slate-500" />
                  <span className="truncate">{ch.name}</span>
                </button>
              );
            })}
          </div>

          {/* Current User Pill */}
          <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"
                  alt="You"
                  className="w-8 h-8 rounded-full object-cover"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">You</div>
                <div className="text-[10px] text-slate-400 truncate">#Online</div>
              </div>
            </div>
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
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-400">
              Welcome to the beginning of the <strong className="text-white">#{activeChannelObj.name}</strong> channel.
            </div>

            {channelMessages.map((msg) => (
              <div key={msg.id} className="flex items-start gap-3 group">
                <img
                  src={msg.avatar}
                  alt={msg.author}
                  className="w-9 h-9 rounded-full object-cover shrink-0 mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white">
                      {msg.author}
                    </span>
                    {msg.role === 'admin' && (
                      <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-amber-500/20 text-amber-400 flex items-center gap-0.5">
                        <Crown className="w-3 h-3" /> ADMIN
                      </span>
                    )}
                    {msg.role === 'bot' && (
                      <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-blue-500/20 text-blue-400 flex items-center gap-0.5">
                        <Bot className="w-3 h-3" /> BOT
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500">
                      {msg.timestamp}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mt-1 leading-relaxed break-words">
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
                    {/* Quick emoji adders on hover */}
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
                      onClick={() => handleReact(msg.id, '🎮')}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-800 rounded text-xs transition-opacity"
                    >
                      🎮
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Discord Input Box */}
          <div className="p-4 bg-slate-900 border-t border-slate-800">
            <form
              onSubmit={handleSendMessage}
              className="flex items-center gap-2 bg-slate-800/90 rounded-xl px-4 py-2 border border-slate-700/80 focus-within:ring-2 focus-within:ring-rose-500 transition-all"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Message #${activeChannelObj.name} (type !help for bot commands)`}
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

        {/* Right Online Members Column */}
        {showMembers && (
          <div className="w-48 bg-slate-950/70 border-l border-slate-800/80 p-3 hidden lg:flex flex-col overflow-y-auto">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Online — {ONLINE_MEMBERS.length}
            </div>
            <div className="space-y-2">
              {ONLINE_MEMBERS.map((m) => (
                <div key={m.name} className="flex items-center gap-2 py-1 px-1.5 rounded-lg hover:bg-slate-900">
                  <div className="relative">
                    <img src={m.avatar} alt={m.name} className="w-7 h-7 rounded-full object-cover" />
                    <span
                      className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ring-2 ring-slate-950 ${
                        m.status === 'online'
                          ? 'bg-emerald-500'
                          : m.status === 'idle'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-200 truncate">{m.name}</div>
                    <div className="text-[10px] text-slate-500 capitalize">{m.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
