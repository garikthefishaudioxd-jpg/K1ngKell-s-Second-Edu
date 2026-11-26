import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { EmbedTabItem, EmbedSearchResult, SearchEngine, LogoStyle } from '../types';
import { Logo } from './Logo';
import {
  Plus,
  X,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Search,
  Globe,
  Home,
  List,
  Maximize2,
  RefreshCw,
  Sparkles,
  BookOpen,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface TabFaviconProps {
  url?: string;
  faviconUrl?: string;
}

function getHostname(rawUrl?: string): string | null {
  if (!rawUrl) return null;
  try {
    return new URL(rawUrl).hostname;
  } catch {
    return null;
  }
}

const TabFavicon: React.FC<TabFaviconProps> = ({ url, faviconUrl }) => {
  const hostname = getHostname(url);
  const candidates = React.useMemo(() => {
    const list: string[] = [];
    if (faviconUrl) list.push(faviconUrl);
    if (hostname) {
      list.push(
        `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`,
        `https://icons.duckduckgo.com/ip3/${encodeURIComponent(hostname)}.ico`
      );
    }
    return list;
  }, [faviconUrl, hostname]);

  const [candidateIdx, setCandidateIdx] = useState(0);

  useEffect(() => {
    setCandidateIdx(0);
  }, [url, faviconUrl]);

  const src = candidates[candidateIdx];
  if (!src) {
    return <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
  }

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      onError={() => setCandidateIdx((i) => i + 1)}
      className="w-3.5 h-3.5 rounded-xs object-contain shrink-0"
    />
  );
};

interface EmbedWorkspaceProps {
  tabs: EmbedTabItem[];
  activeTabId: string | null;
  searchEngine: SearchEngine;
  logoStyle: LogoStyle;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: () => void;
  onNavigateInTab: (tabId: string, input: string) => void;
  onUpdateTab: (tabId: string, patch: Partial<EmbedTabItem>) => void;
  onReorderTabs: (fromIndex: number, toIndex: number) => void;
  onExitToPortal: () => void;
}

export const EmbedWorkspace: React.FC<EmbedWorkspaceProps> = ({
  tabs,
  activeTabId,
  searchEngine,
  logoStyle,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onNavigateInTab,
  onUpdateTab,
  onReorderTabs,
  onExitToPortal,
}) => {
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0] || null;
  const [omniboxValue, setOmniboxValue] = useState<string>('');
  const [reloadNonces, setReloadNonces] = useState<Record<string, number>>({});
  const [refreshingTabId, setRefreshingTabId] = useState<string | null>(null);
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{
    tabId: string;
    position: 'before' | 'after';
  } | null>(null);
  const fetchedFaviconUrlsRef = React.useRef<Set<string>>(new Set());
  const iframeRefs = React.useRef<Record<string, HTMLIFrameElement | null>>({});

  useEffect(() => {
    if (activeTab) {
      if (activeTab.viewMode === 'newtab') {
        setOmniboxValue('');
      } else {
        setOmniboxValue(activeTab.url || activeTab.query || '');
      }
    }
  }, [activeTab?.id, activeTab?.url, activeTab?.query, activeTab?.viewMode]);

  useEffect(() => {
    let cancelled = false;

    tabs.forEach((tab) => {
      if (!tab.url || tab.faviconUrl) return;
      const cacheKey = `${tab.id}::${tab.url}`;
      if (fetchedFaviconUrlsRef.current.has(cacheKey)) return;
      fetchedFaviconUrlsRef.current.add(cacheKey);

      const hostname = getHostname(tab.url);
      if (!hostname) return;

      const publicIcon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;

      fetch(`/api/favicon?url=${encodeURIComponent(tab.url)}`)
        .then(async (res) => {
          const ct = res.headers.get('content-type') || '';
          if (res.ok && ct.includes('application/json')) {
            const data = await res.json();
            return typeof data.faviconUrl === 'string' && data.faviconUrl
              ? data.faviconUrl
              : publicIcon;
          }
          return publicIcon;
        })
        .catch(() => publicIcon)
        .then((resolvedUrl) => {
          if (!cancelled && resolvedUrl) {
            onUpdateTab(tab.id, { faviconUrl: resolvedUrl });
          }
        });
    });

    return () => {
      cancelled = true;
    };
  }, [tabs, onUpdateTab]);

  // Listen for real postMessage audio/playback events from YouTube, Vimeo, and SoundCloud embeds
  useEffect(() => {
    const handlePlayerMessage = (event: MessageEvent) => {
      const matchedEntry = Object.entries(iframeRefs.current).find(
        ([, frame]) => frame && frame.contentWindow === event.source
      );
      if (!matchedEntry) return;
      const [tabId] = matchedEntry;

      let payload: any = event.data;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch {
          return;
        }
      }
      if (!payload || typeof payload !== 'object') return;

      // YouTube IFrame API events
      if (payload.event === 'infoDelivery' && payload.info && typeof payload.info === 'object') {
        const patch: Partial<EmbedTabItem> = {};
        if (typeof payload.info.playerState === 'number') {
          if (payload.info.playerState === 1) patch.isPlayingAudio = true;
          else if (payload.info.playerState === 2 || payload.info.playerState === 0) {
            patch.isPlayingAudio = false;
          }
        }
        if (typeof payload.info.muted === 'boolean') {
          patch.isMuted = payload.info.muted;
        }
        if (Object.keys(patch).length > 0) {
          onUpdateTab(tabId, patch);
        }
        return;
      }

      if (payload.event === 'onStateChange' && typeof payload.info === 'number') {
        if (payload.info === 1) onUpdateTab(tabId, { isPlayingAudio: true });
        else if (payload.info === 2 || payload.info === 0) {
          onUpdateTab(tabId, { isPlayingAudio: false });
        }
        return;
      }

      // Vimeo / SoundCloud widget events
      const eventName = payload.event || payload.method;
      if (eventName === 'play') {
        onUpdateTab(tabId, { isPlayingAudio: true });
      } else if (eventName === 'pause' || eventName === 'finish' || eventName === 'ended') {
        onUpdateTab(tabId, { isPlayingAudio: false });
      }
    };

    window.addEventListener('message', handlePlayerMessage);
    return () => window.removeEventListener('message', handlePlayerMessage);
  }, [onUpdateTab]);

  if (!activeTab) return null;

  const sendPlayerCommand = (tab: EmbedTabItem, action: 'mute' | 'unmute') => {
    const win = iframeRefs.current[tab.id]?.contentWindow;
    if (!win || !tab.url) return;
    const lower = tab.url.toLowerCase();
    try {
      if (lower.includes('youtube.com')) {
        win.postMessage(
          JSON.stringify({
            event: 'command',
            func: action === 'mute' ? 'mute' : 'unMute',
            args: [],
          }),
          '*'
        );
      } else if (lower.includes('vimeo.com') || lower.includes('soundcloud.com')) {
        win.postMessage(
          JSON.stringify({
            method: 'setVolume',
            value: action === 'mute' ? 0 : 1,
          }),
          '*'
        );
      }
    } catch {
      // Cross-origin command ignored
    }
  };

  const handleToggleTabMute = (tab: EmbedTabItem) => {
    const nextMuted = !tab.isMuted;
    sendPlayerCommand(tab, nextMuted ? 'mute' : 'unmute');
    onUpdateTab(tab.id, { isMuted: nextMuted });
  };

  const handleRefreshTab = (tabId: string) => {
    const target = tabs.find((t) => t.id === tabId);
    if (!target || !target.url || target.viewMode !== 'embed') return;

    const frame = iframeRefs.current[tabId];
    if (frame) {
      // Reset iframe src immediately and bump key nonce to ensure a clean reload
      frame.src = target.url;
    }

    setReloadNonces((prev) => ({
      ...prev,
      [tabId]: (prev[tabId] || 0) + 1,
    }));
    setRefreshingTabId(tabId);
    onUpdateTab(tabId, { isPlayingAudio: false, isMuted: false });
    window.setTimeout(() => {
      setRefreshingTabId((curr) => (curr === tabId ? null : curr));
    }, 500);
  };

  const handleIframeLoad = (tab: EmbedTabItem) => {
    const win = iframeRefs.current[tab.id]?.contentWindow;
    const lower = (tab.url || '').toLowerCase();
    if (win) {
      try {
        if (lower.includes('youtube.com')) {
          win.postMessage(JSON.stringify({ event: 'listening', id: tab.id }), '*');
          win.postMessage(
            JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onStateChange'] }),
            '*'
          );
        } else if (lower.includes('vimeo.com') || lower.includes('soundcloud.com')) {
          ['play', 'pause', 'finish'].forEach((evt) => {
            win.postMessage(JSON.stringify({ method: 'addEventListener', value: evt }), '*');
          });
        }
      } catch {
        // Ignore postMessage handshake errors
      }
    }

    const isKnownAudioMedia =
      /(open\.spotify\.com\/embed|player\.twitch\.tv|twitch\.tv|bandcamp\.com|mixcloud\.com|w\.soundcloud\.com)/i.test(
        lower
      ) || /\.(mp3|wav|ogg|mp4|webm)(\?|$)/i.test(lower);

    if (isKnownAudioMedia && !tab.isPlayingAudio) {
      onUpdateTab(tab.id, { isPlayingAudio: true });
    }
  };

  const clearDragState = () => {
    setDraggedTabId(null);
    setDropIndicator(null);
  };

  const handleTabDragStart = (e: React.DragEvent<HTMLDivElement>, tabId: string) => {
    setDraggedTabId(tabId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tabId);
  };

  const handleTabDragOver = (e: React.DragEvent<HTMLDivElement>, targetTabId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    if (!draggedTabId || draggedTabId === targetTabId) {
      if (dropIndicator?.tabId === targetTabId) setDropIndicator(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const position: 'before' | 'after' =
      e.clientX < rect.left + rect.width / 2 ? 'before' : 'after';

    if (dropIndicator?.tabId !== targetTabId || dropIndicator?.position !== position) {
      setDropIndicator({ tabId: targetTabId, position });
    }
  };

  const handleTabDrop = (e: React.DragEvent<HTMLDivElement>, targetTabId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const sourceId = draggedTabId || e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetTabId) {
      clearDragState();
      return;
    }

    const fromIndex = tabs.findIndex((t) => t.id === sourceId);
    const targetIndex = tabs.findIndex((t) => t.id === targetTabId);
    if (fromIndex === -1 || targetIndex === -1) {
      clearDragState();
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const dropAfter = e.clientX >= rect.left + rect.width / 2;
    let toIndex = dropAfter ? targetIndex + 1 : targetIndex;
    if (fromIndex < toIndex) {
      toIndex -= 1;
    }

    onReorderTabs(fromIndex, Math.max(0, Math.min(tabs.length - 1, toIndex)));
    clearDragState();
  };

  const handleTabStripDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!draggedTabId || tabs.length === 0) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const lastTab = tabs[tabs.length - 1];
    if (lastTab && lastTab.id !== draggedTabId) {
      setDropIndicator({ tabId: lastTab.id, position: 'after' });
    }
  };

  const handleTabStripDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!draggedTabId || tabs.length === 0) return;
    e.preventDefault();
    const fromIndex = tabs.findIndex((t) => t.id === draggedTabId);
    if (fromIndex !== -1 && fromIndex !== tabs.length - 1) {
      onReorderTabs(fromIndex, tabs.length - 1);
    }
    clearDragState();
  };

  const canGoBack = activeTab.historyIndex > 0;
  const canGoForward = activeTab.historyIndex < activeTab.history.length - 1;

  const handleBack = () => {
    if (!canGoBack) return;
    const prevIdx = activeTab.historyIndex - 1;
    const prevUrl = activeTab.history[prevIdx];
    onUpdateTab(activeTab.id, {
      url: prevUrl,
      faviconUrl: undefined,
      isPlayingAudio: false,
      isMuted: false,
      historyIndex: prevIdx,
      viewMode: 'embed',
    });
  };

  const handleForward = () => {
    if (!canGoForward) return;
    const nextIdx = activeTab.historyIndex + 1;
    const nextUrl = activeTab.history[nextIdx];
    onUpdateTab(activeTab.id, {
      url: nextUrl,
      faviconUrl: undefined,
      isPlayingAudio: false,
      isMuted: false,
      historyIndex: nextIdx,
      viewMode: 'embed',
    });
  };

  const handleOmniboxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = omniboxValue.trim();
    if (!val) return;
    onNavigateInTab(activeTab.id, val);
  };

  const handleOpenResultInTab = (result: EmbedSearchResult, openAsNewTab: boolean) => {
    if (openAsNewTab) {
      // Create via parent navigation helper by triggering new tab or direct update
      onNavigateInTab('__new__', result.url);
    } else {
      const nextHistory = [
        ...activeTab.history.slice(0, activeTab.historyIndex + 1),
        result.url,
      ];
      onUpdateTab(activeTab.id, {
        title: result.title,
        url: result.url,
        faviconUrl: undefined,
        isPlayingAudio: false,
        isMuted: false,
        viewMode: 'embed',
        history: nextHistory,
        historyIndex: nextHistory.length - 1,
      });
    }
  };

  const quickBookmarks = [
    { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Main_Page' },
    { label: 'Internet Archive', url: 'https://archive.org' },
    { label: 'OpenStreetMap', url: 'https://www.openstreetmap.org/export/embed.html' },
    { label: 'CodePen', url: 'https://codepen.io' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 w-screen h-screen overflow-hidden">
      {/* Row 1: Browser-Style Tabs Strip at Top */}
      <div className="h-11 bg-slate-950 border-b border-slate-800 flex items-center px-2 gap-1.5 overflow-x-auto scrollbar-none shrink-0">
        {/* Return to K1ngkell Portal Button */}
        <button
          onClick={onExitToPortal}
          title="Back to K1ngkell Portal"
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-white shrink-0 transition-colors"
        >
          <Logo style={logoStyle} className="w-4 h-4" showText={false} />
          <Home className="w-3.5 h-3.5 text-rose-500" />
          <span className="hidden sm:inline whitespace-nowrap">K1ngkell</span>
        </button>

        <div className="h-5 w-px bg-slate-800 shrink-0 mx-0.5" />

        {/* Open Embed Tabs */}
        <div
          role="tablist"
          aria-label="Open embed tabs"
          onDragOver={handleTabStripDragOver}
          onDrop={handleTabStripDrop}
          className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto scrollbar-none"
        >
          <AnimatePresence initial={false}>
            {tabs.map((tab, index) => {
              const isActive = tab.id === activeTab.id;
              const isDragging = draggedTabId === tab.id;
              const showDropBefore =
                dropIndicator?.tabId === tab.id && dropIndicator.position === 'before';
              const showDropAfter =
                dropIndicator?.tabId === tab.id && dropIndicator.position === 'after';

              return (
                <motion.div
                  key={tab.id}
                  layout="position"
                  initial={{ opacity: 0, scale: 0.92, width: 0 }}
                  animate={{ opacity: 1, scale: 1, width: 'auto' }}
                  exit={{ opacity: 0, scale: 0.9, width: 0 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                  className="shrink-0 overflow-hidden"
                >
                  <div
                    role="tab"
                    aria-selected={isActive}
                    tabIndex={0}
                    draggable
                    onDragStart={(e) => handleTabDragStart(e, tab.id)}
                    onDragOver={(e) => handleTabDragOver(e, tab.id)}
                    onDrop={(e) => handleTabDrop(e, tab.id)}
                    onDragEnd={clearDragState}
                    onKeyDown={(e) => {
                      if (e.altKey && e.key === 'ArrowLeft' && index > 0) {
                        e.preventDefault();
                        onReorderTabs(index, index - 1);
                      } else if (e.altKey && e.key === 'ArrowRight' && index < tabs.length - 1) {
                        e.preventDefault();
                        onReorderTabs(index, index + 1);
                      }
                    }}
                    onClick={() => onSelectTab(tab.id)}
                    title={`${tab.title || 'New Tab'} (Drag to reorder)`}
                    className={`relative group flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg rounded-b-sm text-xs font-medium select-none transition-colors max-w-[220px] min-w-[120px] shrink-0 border ${
                      isDragging
                        ? 'opacity-45 scale-[0.97] cursor-grabbing ring-1 ring-blue-500/60'
                        : 'cursor-grab active:cursor-grabbing'
                    } ${
                      isActive
                        ? 'bg-slate-900 text-white border-slate-700 border-b-slate-900'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border-transparent'
                    }`}
                  >
                    {showDropBefore && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-gradient-to-b from-rose-500 to-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.9)]"
                      />
                    )}
                    {showDropAfter && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute right-0 top-1 bottom-1 w-0.5 rounded-full bg-gradient-to-b from-rose-500 to-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.9)]"
                      />
                    )}
                    {tab.isLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-500 shrink-0" />
                    ) : (
                      <TabFavicon url={tab.url} faviconUrl={tab.faviconUrl} />
                    )}
                    <span className="truncate flex-1">{tab.title || 'New Tab'}</span>
                    {tab.isPlayingAudio && (
                      <button
                        type="button"
                        draggable={false}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleTabMute(tab);
                        }}
                        title={
                          tab.isMuted
                            ? 'Tab audio muted (click to unmute)'
                            : 'Playing audio (click to mute)'
                        }
                        aria-label={
                          tab.isMuted
                            ? `Unmute ${tab.title || 'tab'}`
                            : `Mute ${tab.title || 'tab'}`
                        }
                        className={`p-0.5 rounded transition-colors shrink-0 ${
                          tab.isMuted
                            ? 'text-rose-400 hover:bg-rose-950/60'
                            : 'text-emerald-400 hover:bg-emerald-950/60'
                        }`}
                      >
                        {tab.isMuted ? (
                          <VolumeX className="w-3.5 h-3.5" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                        )}
                      </button>
                    )}
                    {tab.viewMode === 'embed' && tab.url && (
                      <button
                        type="button"
                        draggable={false}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRefreshTab(tab.id);
                        }}
                        title="Refresh tab iframe"
                        aria-label={`Refresh ${tab.title || 'tab'}`}
                        className={`p-0.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-opacity shrink-0 ${
                          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <RotateCw
                          className={`w-3 h-3 ${
                            refreshingTabId === tab.id ? 'animate-spin text-blue-400' : ''
                          }`}
                        />
                      </button>
                    )}
                    <button
                      type="button"
                      draggable={false}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseTab(tab.id);
                      }}
                      title="Close tab"
                      className="p-0.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Add New Tab Button */}
          <button
            onClick={onNewTab}
            title="New Tab"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Row 2: Address & Search Toolbar */}
      <div className="h-12 bg-slate-900 border-b border-slate-800 px-3 flex items-center gap-2 shrink-0">
        {/* Back / Forward / Reload */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleBack}
            disabled={!canGoBack}
            title="Back"
            className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 disabled:opacity-30 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleForward}
            disabled={!canGoForward}
            title="Forward"
            className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 disabled:opacity-30 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleRefreshTab(activeTab.id)}
            disabled={!activeTab.url || activeTab.viewMode !== 'embed'}
            title="Reload Embed"
            className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 disabled:opacity-30 transition-colors"
          >
            <RotateCw
              className={`w-4 h-4 ${
                refreshingTabId === activeTab.id ? 'animate-spin text-blue-400' : ''
              }`}
            />
          </button>
        </div>

        {/* Omnibox: Enter URL or Search */}
        <form onSubmit={handleOmniboxSubmit} className="flex-1 min-w-0">
          <div className="flex items-center bg-slate-950 border border-slate-700/80 focus-within:border-blue-500 rounded-xl px-3 py-1.5 gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={omniboxValue}
              onChange={(e) => setOmniboxValue(e.target.value)}
              placeholder={`Enter any embeddable link (https://...) or search with ${searchEngine.toUpperCase()}...`}
              className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-hidden"
            />
            <button
              type="submit"
              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-rose-600 to-blue-600 hover:from-rose-700 hover:to-blue-700 text-white text-[11px] font-semibold shrink-0"
            >
              Go
            </button>
          </div>
        </form>

        {/* View Mode Switcher, Audio Cue Toggle & Portal Exit */}
        <div className="flex items-center gap-1.5 shrink-0">
          {activeTab.viewMode === 'embed' && activeTab.url && (
            <button
              type="button"
              onClick={() =>
                onUpdateTab(activeTab.id, {
                  isPlayingAudio: !activeTab.isPlayingAudio,
                  isMuted: false,
                })
              }
              title={
                activeTab.isPlayingAudio
                  ? 'Clear audio indicator for this tab'
                  : 'Flag this tab as playing audio'
              }
              className={`p-1.5 rounded-lg border transition-colors ${
                activeTab.isPlayingAudio
                  ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-400 hover:bg-emerald-900/50'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          )}

          {activeTab.results && activeTab.results.length > 0 && (
            <button
              onClick={() =>
                onUpdateTab(activeTab.id, {
                  viewMode: activeTab.viewMode === 'embed' ? 'results' : 'embed',
                })
              }
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab.viewMode === 'results'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title="Toggle Search Results List"
            >
              {activeTab.viewMode === 'embed' ? (
                <>
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Results ({activeTab.results.length})</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Show Embed</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={onExitToPortal}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors whitespace-nowrap"
          >
            Portal Home
          </button>
        </div>
      </div>

      {/* Main Full-Screen Viewport */}
      <div className="flex-1 relative w-full h-full bg-slate-950 overflow-hidden">
        {/* Loading Overlay */}
        {activeTab.isLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 text-white gap-3">
            <RefreshCw className="w-7 h-7 animate-spin text-rose-500" />
            <p className="text-xs font-semibold text-slate-300">
              Finding best link and loading full-screen embed...
            </p>
          </div>
        )}

        {/* New Tab Start Page */}
        {activeTab.viewMode === 'newtab' && !activeTab.isLoading && (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-6 overflow-y-auto">
            <Logo style={logoStyle} className="w-16 h-16" showText={false} />
            <div className="space-y-2 max-w-lg">
              <h2 className="text-2xl font-black text-white">
                <span className="text-rose-500">K1</span>
                <span className="text-blue-500">ngkell</span> Full-Screen Embed
              </h2>
              <p className="text-xs text-slate-400">
                Paste any link or enter a search query above. Searches automatically take you straight to the top link inside this full-screen embed.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl">
              {quickBookmarks.map((bm) => (
                <button
                  key={bm.url}
                  onClick={() => onNavigateInTab(activeTab.id, bm.url)}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-2 transition-colors"
                >
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span>{bm.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Results & Summary View (if toggled or if no embeddable URL found) */}
        {activeTab.viewMode === 'results' && !activeTab.isLoading && (
          <div className="w-full h-full overflow-y-auto p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                  <span>
                    {searchEngine.toUpperCase()} Results {activeTab.query ? `for "${activeTab.query}"` : ''}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Click any link below to open it full-screen in this tab, or click &ldquo;+ Tab&rdquo; to open it in a new top tab.
                </p>
              </div>
              {activeTab.query && (searchEngine === 'google' || searchEngine === 'bing') && (
                <button
                  type="button"
                  onClick={() => {
                    const searchUrl =
                      searchEngine === 'google'
                        ? `https://www.google.com/search?igu=1&q=${encodeURIComponent(activeTab.query || '')}`
                        : `https://www.bing.com/search?q=${encodeURIComponent(activeTab.query || '')}`;
                    const nextHistory = [
                      ...activeTab.history.slice(0, activeTab.historyIndex + 1),
                      searchUrl,
                    ];
                    onUpdateTab(activeTab.id, {
                      title: `${searchEngine.toUpperCase()}: ${activeTab.query}`,
                      url: searchUrl,
                      faviconUrl: undefined,
                      viewMode: 'embed',
                      history: nextHistory,
                      historyIndex: nextHistory.length - 1,
                    });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-blue-400 flex items-center gap-1.5 transition-colors"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>View {searchEngine === 'google' ? 'Google' : 'Bing'} Page</span>
                </button>
              )}
            </div>

            {activeTab.summary && (
              <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-900/60 space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Instant Answer</span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">{activeTab.summary}</p>
              </div>
            )}

            {activeTab.error && (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300">
                {activeTab.error}
              </div>
            )}

            <div className="space-y-3">
              {(activeTab.results || []).map((res, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div
                    onClick={() => handleOpenResultInTab(res, false)}
                    className="cursor-pointer flex-1 min-w-0 space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-blue-400 hover:underline truncate">
                        {res.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">
                        {res.source}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-2">{res.snippet}</p>
                    <div className="text-[11px] font-mono text-slate-500 truncate">{res.url}</div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenResultInTab(res, false)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
                    >
                      Open Embed
                    </button>
                    <button
                      onClick={() => handleOpenResultInTab(res, true)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                    >
                      + Tab
                    </button>
                  </div>
                </div>
              ))}

              {(!activeTab.results || activeTab.results.length === 0) && !activeTab.summary && (
                <div className="p-8 text-center rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
                  No direct embeddable links returned for this query. Try entering a full URL in the address bar above.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Full-Screen Live Iframe Embeds (background tabs stay mounted so audio & state persist) */}
        {tabs
          .filter((tab) => tab.viewMode === 'embed' && Boolean(tab.url))
          .map((tab) => {
            const isTabVisible =
              tab.id === activeTab.id && activeTab.viewMode === 'embed' && !activeTab.isLoading;
            return (
              <iframe
                key={`${tab.id}-${tab.url}-${reloadNonces[tab.id] || 0}`}
                ref={(el) => {
                  iframeRefs.current[tab.id] = el;
                }}
                src={tab.url}
                title={tab.title || 'Embedded Page'}
                onLoad={() => handleIframeLoad(tab)}
                className={
                  isTabVisible
                    ? 'w-full h-full border-0 bg-white'
                    : 'hidden'
                }
                allow="autoplay; fullscreen; clipboard-read; clipboard-write"
              />
            );
          })}
      </div>
    </div>
  );
};
