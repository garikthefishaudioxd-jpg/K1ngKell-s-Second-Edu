/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ActiveTab,
  BackgroundTheme,
  PrimaryColor,
  SearchEngine,
  LogoStyle,
  EmbedTabItem,
  EmbedSearchResult,
} from './types';
import { BackgroundWrapper } from './components/BackgroundWrapper';
import { SignInGate } from './components/SignInGate';
import { Navbar } from './components/Navbar';
import { HomeTab } from './components/HomeTab';
import { GamesTab } from './components/GamesTab';
import { MusicTab } from './components/MusicTab';
import { CinemaTab } from './components/CinemaTab';
import { ChatTab } from './components/ChatTab';
import { AiAssistantTab } from './components/AiAssistantTab';
import { SecurityTab } from './components/SecurityTab';
import { SettingsTab } from './components/SettingsTab';
import { EmbedWorkspace } from './components/EmbedWorkspace';

function isLikelyUrl(input: string): boolean {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/\s/.test(trimmed)) return false;
  return /^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+([:/?#].*)?$/.test(trimmed);
}

function normalizeEmbedUrl(raw: string): { url: string; title: string } {
  const withProto = /^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`;
  try {
    const parsed = new URL(withProto);
    // Convert standard YouTube links to embeddable player URLs
    if (
      (parsed.hostname.includes('youtube.com') && parsed.pathname === '/watch') ||
      parsed.hostname === 'youtu.be'
    ) {
      const videoId =
        parsed.hostname === 'youtu.be'
          ? parsed.pathname.slice(1)
          : parsed.searchParams.get('v');
      if (videoId) {
        return {
          url: `https://www.youtube.com/embed/${videoId}`,
          title: `YouTube (${videoId})`,
        };
      }
    }
    // Convert standard Vimeo links to embeddable player URLs
    if (parsed.hostname === 'vimeo.com' && /^\/\d+/.test(parsed.pathname)) {
      const id = parsed.pathname.slice(1).split('/')[0];
      return {
        url: `https://player.vimeo.com/video/${id}`,
        title: `Vimeo (${id})`,
      };
    }
    return {
      url: parsed.toString(),
      title: parsed.hostname.replace(/^www\./, ''),
    };
  } catch {
    return { url: withProto, title: raw.trim() };
  }
}

export default function App() {
  // Gatekeeper state
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return localStorage.getItem('k1ngkell_gate_unlocked') === 'true';
  });

  // Navigation tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  // Full-Screen Tabbed Embed Workspace State
  const [embedTabs, setEmbedTabs] = useState<EmbedTabItem[]>([]);
  const [activeEmbedTabId, setActiveEmbedTabId] = useState<string | null>(null);
  const [isEmbedOpen, setIsEmbedOpen] = useState<boolean>(false);

  // Settings State with Persistence
  const [theme, setTheme] = useState<BackgroundTheme>(() => {
    return (localStorage.getItem('k1ngkell_theme') as BackgroundTheme) || 'sunny-hill';
  });

  const [customWallpaperUrl, setCustomWallpaperUrl] = useState<string>(() => {
    return localStorage.getItem('k1ngkell_custom_wallpaper') || '';
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('k1ngkell_dark_mode') === 'true';
  });

  const [primaryColor, setPrimaryColor] = useState<PrimaryColor>(() => {
    return (localStorage.getItem('k1ngkell_primary_color') as PrimaryColor) || 'rose-red';
  });

  const [customColorHex, setCustomColorHex] = useState<string>(() => {
    return localStorage.getItem('k1ngkell_custom_color') || '#e11d48';
  });

  const [searchEngine, setSearchEngine] = useState<SearchEngine>(() => {
    return (localStorage.getItem('k1ngkell_search_engine') as SearchEngine) || 'google';
  });

  const [timezone, setTimezone] = useState<string>(() => {
    return localStorage.getItem('k1ngkell_timezone') || 'America/New_York';
  });

  const [logoStyle, setLogoStyle] = useState<LogoStyle>(() => {
    return (localStorage.getItem('k1ngkell_logo_style') as LogoStyle) || 'packet-bottle';
  });

  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    return localStorage.getItem('k1ngkell_custom_gemini_key') || '';
  });

  const [offlineMode, setOfflineMode] = useState<boolean>(() => {
    return localStorage.getItem('k1ngkell_offline_mode') === 'true';
  });

  // Keep dark class on html root element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('k1ngkell_dark_mode', darkMode.toString());
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('k1ngkell_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (customWallpaperUrl) {
      localStorage.setItem('k1ngkell_custom_wallpaper', customWallpaperUrl);
    }
  }, [customWallpaperUrl]);

  useEffect(() => {
    localStorage.setItem('k1ngkell_primary_color', primaryColor);
    localStorage.setItem('k1ngkell_custom_color', customColorHex);
    document.documentElement.style.setProperty('--primary-brand', customColorHex);
  }, [primaryColor, customColorHex]);

  useEffect(() => {
    localStorage.setItem('k1ngkell_search_engine', searchEngine);
  }, [searchEngine]);

  useEffect(() => {
    localStorage.setItem('k1ngkell_timezone', timezone);
  }, [timezone]);

  useEffect(() => {
    localStorage.setItem('k1ngkell_logo_style', logoStyle);
  }, [logoStyle]);

  useEffect(() => {
    localStorage.setItem('k1ngkell_offline_mode', offlineMode.toString());
  }, [offlineMode]);

  const handleLockGate = () => {
    localStorage.removeItem('k1ngkell_gate_unlocked');
    setIsUnlocked(false);
    setIsEmbedOpen(false);
  };

  const handleLaunchGame = (gameId: string) => {
    setSelectedGameId(gameId);
    setActiveTab('games');
  };

  const updateEmbedTab = useCallback((tabId: string, patch: Partial<EmbedTabItem>) => {
    setEmbedTabs((prev) =>
      prev.map((tab) => (tab.id === tabId ? { ...tab, ...patch } : tab))
    );
  }, []);

  const navigateInEmbedTab = useCallback(
    async (targetTabId: string, rawInput: string) => {
      const input = rawInput.trim();
      if (!input) return;

      let tabId = targetTabId;

      if (tabId === '__new__') {
        tabId = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const placeholderTab: EmbedTabItem = {
          id: tabId,
          title: input,
          url: '',
          query: input,
          isLoading: false,
          viewMode: 'newtab',
          history: [],
          historyIndex: -1,
        };
        setEmbedTabs((prev) => [...prev, placeholderTab]);
        setActiveEmbedTabId(tabId);
      }

      setIsEmbedOpen(true);

      // Direct Link -> load immediately in full-screen embed
      if (isLikelyUrl(input)) {
        const { url, title } = normalizeEmbedUrl(input);
        setEmbedTabs((prev) =>
          prev.map((t) => {
            if (t.id !== tabId) return t;
            const nextHistory = [...t.history.slice(0, t.historyIndex + 1), url];
            return {
              ...t,
              title,
              url,
              query: undefined,
              isLoading: false,
              error: undefined,
              viewMode: 'embed',
              history: nextHistory,
              historyIndex: nextHistory.length - 1,
            };
          })
        );
        return;
      }

      // Search Query -> resolve via /api/web-search and take user directly to top link in full-screen embed
      updateEmbedTab(tabId, {
        title: `Search: ${input}`,
        query: input,
        isLoading: true,
        error: undefined,
      });

      try {
        const res = await fetch('/api/web-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: input, engine: searchEngine }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Search failed');
        }

        const results: EmbedSearchResult[] = Array.isArray(data.results) ? data.results : [];
        const summary: string = data.instantSummary || '';

        // Prefer Wikipedia / directly embeddable result first, otherwise first result URL
        const preferredResult =
          results.find((r) => r.source === 'Wikipedia') || results[0];

        if (preferredResult?.url) {
          const { url } = normalizeEmbedUrl(preferredResult.url);
          setEmbedTabs((prev) =>
            prev.map((t) => {
              if (t.id !== tabId) return t;
              const nextHistory = [...t.history.slice(0, t.historyIndex + 1), url];
              return {
                ...t,
                title: preferredResult.title || input,
                url,
                query: input,
                results,
                summary,
                isLoading: false,
                error: undefined,
                viewMode: 'embed',
                history: nextHistory,
                historyIndex: nextHistory.length - 1,
              };
            })
          );
        } else {
          updateEmbedTab(tabId, {
            title: `Search: ${input}`,
            url: '',
            query: input,
            results,
            summary,
            isLoading: false,
            viewMode: 'results',
          });
        }
      } catch (err: any) {
        updateEmbedTab(tabId, {
          title: `Search: ${input}`,
          isLoading: false,
          error: err.message || 'Unable to resolve search results.',
          viewMode: 'results',
        });
      }
    },
    [searchEngine, updateEmbedTab]
  );

  const handleOpenEmbedFromHome = (queryOrUrl: string) => {
    navigateInEmbedTab('__new__', queryOrUrl);
  };

  const handleNewEmbedTab = () => {
    const id = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const blankTab: EmbedTabItem = {
      id,
      title: 'New Tab',
      url: '',
      viewMode: 'newtab',
      history: [],
      historyIndex: -1,
    };
    setEmbedTabs((prev) => [...prev, blankTab]);
    setActiveEmbedTabId(id);
    setIsEmbedOpen(true);
  };

  const handleCloseEmbedTab = (tabId: string) => {
    setEmbedTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === tabId);
      const next = prev.filter((t) => t.id !== tabId);
      if (next.length === 0) {
        setActiveEmbedTabId(null);
        setIsEmbedOpen(false);
      } else if (activeEmbedTabId === tabId) {
        const fallback = next[Math.max(0, idx - 1)] || next[0];
        setActiveEmbedTabId(fallback.id);
      }
      return next;
    });
  };

  if (!isUnlocked) {
    return (
      <BackgroundWrapper
        theme={theme}
        customWallpaperUrl={customWallpaperUrl}
        darkMode={darkMode}
      >
        <SignInGate
          logoStyle={logoStyle}
          onUnlock={() => setIsUnlocked(true)}
        />
      </BackgroundWrapper>
    );
  }

  return (
    <BackgroundWrapper
      theme={theme}
      customWallpaperUrl={customWallpaperUrl}
      darkMode={darkMode}
    >
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        logoStyle={logoStyle}
        onLockGate={handleLockGate}
        embedTabsCount={embedTabs.length}
        onResumeEmbed={() => setIsEmbedOpen(true)}
      />

      <main className="flex-1 pb-16">
        {activeTab === 'home' && (
          <HomeTab
            setActiveTab={setActiveTab}
            searchEngine={searchEngine}
            setSearchEngine={setSearchEngine}
            logoStyle={logoStyle}
            timezone={timezone}
            onLaunchGame={handleLaunchGame}
            onOpenEmbed={handleOpenEmbedFromHome}
          />
        )}

        {activeTab === 'games' && (
          <GamesTab initialGameId={selectedGameId} />
        )}

        {activeTab === 'music' && <MusicTab />}

        {activeTab === 'cinema' && <CinemaTab />}

        {activeTab === 'chat' && <ChatTab />}

        {activeTab === 'ai' && (
          <AiAssistantTab
            customApiKey={customApiKey}
            setCustomApiKey={setCustomApiKey}
          />
        )}

        {activeTab === 'security' && (
          <SecurityTab
            onLockGate={handleLockGate}
            offlineMode={offlineMode}
            setOfflineMode={setOfflineMode}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            theme={theme}
            setTheme={setTheme}
            customWallpaperUrl={customWallpaperUrl}
            setCustomWallpaperUrl={setCustomWallpaperUrl}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            primaryColor={primaryColor}
            setPrimaryColor={setPrimaryColor}
            customColorHex={customColorHex}
            setCustomColorHex={setCustomColorHex}
            searchEngine={searchEngine}
            setSearchEngine={setSearchEngine}
            timezone={timezone}
            setTimezone={setTimezone}
            logoStyle={logoStyle}
            setLogoStyle={setLogoStyle}
          />
        )}
      </main>

      {isEmbedOpen && embedTabs.length > 0 && (
        <EmbedWorkspace
          tabs={embedTabs}
          activeTabId={activeEmbedTabId}
          searchEngine={searchEngine}
          logoStyle={logoStyle}
          onSelectTab={(id) => setActiveEmbedTabId(id)}
          onCloseTab={handleCloseEmbedTab}
          onNewTab={handleNewEmbedTab}
          onNavigateInTab={navigateInEmbedTab}
          onUpdateTab={updateEmbedTab}
          onExitToPortal={() => setIsEmbedOpen(false)}
        />
      )}
    </BackgroundWrapper>
  );
}
