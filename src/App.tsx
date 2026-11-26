/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
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
import { SignInGate, type FirebaseSignInInfo } from './components/SignInGate';
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
import { getAccount, pickDistinctAvatarForAccount } from './utils/accountAuth';
import { auth } from './firebase';
import {
  setFirestorePresenceOffline,
  syncGoogleUserAccounts,
  waitForPendingGoogleLink,
} from './services/firebaseAccountService';

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
    // Convert standard YouTube links to embeddable player URLs with JS API enabled
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
          url: `https://www.youtube.com/embed/${videoId}?enablejsapi=1`,
          title: `YouTube (${videoId})`,
        };
      }
    }
    if (parsed.hostname.includes('youtube.com') && parsed.pathname.startsWith('/embed/')) {
      if (!parsed.searchParams.has('enablejsapi')) {
        parsed.searchParams.set('enablejsapi', '1');
      }
      return {
        url: parsed.toString(),
        title: parsed.hostname.replace(/^www\./, ''),
      };
    }
    // Convert standard Vimeo links to embeddable player URLs with player API enabled
    if (parsed.hostname === 'vimeo.com' && /^\/\d+/.test(parsed.pathname)) {
      const id = parsed.pathname.slice(1).split('/')[0];
      return {
        url: `https://player.vimeo.com/video/${id}?api=1`,
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

const EMBED_TABS_STORAGE_KEY = 'k1ngkell_embed_tabs';
const ACTIVE_EMBED_TAB_STORAGE_KEY = 'k1ngkell_active_embed_tab_id';
const EMBED_OPEN_STORAGE_KEY = 'k1ngkell_is_embed_open';

function loadSavedEmbedTabs(): EmbedTabItem[] {
  try {
    const raw = localStorage.getItem(EMBED_TABS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is EmbedTabItem =>
          Boolean(item) &&
          typeof item === 'object' &&
          typeof item.id === 'string' &&
          typeof item.title === 'string' &&
          typeof item.url === 'string' &&
          (item.viewMode === 'embed' ||
            item.viewMode === 'results' ||
            item.viewMode === 'newtab')
      )
      .map((tab) => ({
        ...tab,
        faviconUrl: typeof tab.faviconUrl === 'string' ? tab.faviconUrl : undefined,
        isPlayingAudio: false,
        isMuted: false,
        isLoading: false,
        history: Array.isArray(tab.history)
          ? tab.history.filter((u): u is string => typeof u === 'string')
          : tab.url
          ? [tab.url]
          : [],
        historyIndex:
          typeof tab.historyIndex === 'number'
            ? tab.historyIndex
            : tab.url
            ? 0
            : -1,
      }));
  } catch {
    return [];
  }
}

export default function App() {
  // Signed-in session state (starts Signed Out unless user signs in)
  const [signedInUser, setSignedInUser] = useState<string | null>(() => {
    if (localStorage.getItem('k1ngkell_auth_mode') === 'firebase') return null;
    const saved = localStorage.getItem('k1ngkell_signed_in_user');
    return saved && saved.trim() ? saved.trim() : null;
  });
  const [userAvatar, setUserAvatar] = useState<string>(() => {
    if (localStorage.getItem('k1ngkell_auth_mode') === 'firebase') return 'initials';
    const savedUser = localStorage.getItem('k1ngkell_signed_in_user');
    if (savedUser) {
      const acct = getAccount(savedUser);
      if (acct?.avatar) return acct.avatar;
      const distinct = pickDistinctAvatarForAccount(savedUser);
      return distinct;
    }
    return localStorage.getItem('k1ngkell_user_avatar') || 'initials';
  });
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);
  const [firebaseEmail, setFirebaseEmail] = useState<string | null>(null);
  const [userBio, setUserBio] = useState<string>('');
  const firebaseUidRef = useRef<string | null>(null);
  const [showSignInModal, setShowSignInModal] = useState<boolean>(false);

  useEffect(() => {
    firebaseUidRef.current = firebaseUid;
  }, [firebaseUid]);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  // Full-Screen Tabbed Embed Workspace State (Restored from localStorage)
  const [embedTabs, setEmbedTabs] = useState<EmbedTabItem[]>(() =>
    loadSavedEmbedTabs()
  );
  const [activeEmbedTabId, setActiveEmbedTabId] = useState<string | null>(() => {
    const savedTabs = loadSavedEmbedTabs();
    if (savedTabs.length === 0) return null;
    const savedActiveId = localStorage.getItem(ACTIVE_EMBED_TAB_STORAGE_KEY);
    if (savedActiveId && savedTabs.some((t) => t.id === savedActiveId)) {
      return savedActiveId;
    }
    return savedTabs[0].id;
  });
  const [isEmbedOpen, setIsEmbedOpen] = useState<boolean>(() => {
    const savedTabs = loadSavedEmbedTabs();
    return (
      savedTabs.length > 0 &&
      localStorage.getItem(EMBED_OPEN_STORAGE_KEY) === 'true'
    );
  });

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

  // Persist embed tabs, active tab selection, and open workspace state
  useEffect(() => {
    try {
      const serializableTabs = embedTabs.map((tab) => ({
        ...tab,
        isLoading: false,
      }));
      localStorage.setItem(
        EMBED_TABS_STORAGE_KEY,
        JSON.stringify(serializableTabs)
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [embedTabs]);

  useEffect(() => {
    if (activeEmbedTabId) {
      localStorage.setItem(ACTIVE_EMBED_TAB_STORAGE_KEY, activeEmbedTabId);
    } else {
      localStorage.removeItem(ACTIVE_EMBED_TAB_STORAGE_KEY);
    }
  }, [activeEmbedTabId]);

  useEffect(() => {
    localStorage.setItem(
      EMBED_OPEN_STORAGE_KEY,
      (isEmbedOpen && embedTabs.length > 0).toString()
    );
  }, [isEmbedOpen, embedTabs.length]);

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

  useEffect(() => {
    try {
      localStorage.setItem('k1ngkell_user_avatar', userAvatar);
    } catch {
      // ignore storage quota errors
    }
  }, [userAvatar]);

  // Sync Firebase Auth session on load & auth state transitions
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser && fbUser.emailVerified) {
        try {
          await waitForPendingGoogleLink();
          const { publicProfile, privateAccount } = await syncGoogleUserAccounts(fbUser);
          localStorage.setItem('k1ngkell_auth_mode', 'firebase');
          localStorage.setItem('k1ngkell_signed_in_user', publicProfile.username);
          setFirebaseUid(fbUser.uid);
          setFirebaseEmail(privateAccount.email || fbUser.email || null);
          setUserBio(publicProfile.bio || '');
          setUserAvatar(publicProfile.avatar || pickDistinctAvatarForAccount(fbUser.uid));
          setSignedInUser(publicProfile.username);
        } catch (err) {
          console.error('Failed to synchronize Firebase account:', err);
        }
        return;
      }

      if (firebaseUidRef.current || localStorage.getItem('k1ngkell_auth_mode') === 'firebase') {
        localStorage.removeItem('k1ngkell_auth_mode');
        localStorage.removeItem('k1ngkell_signed_in_user');
        localStorage.removeItem('k1ngkell_user_avatar');
        setFirebaseUid(null);
        setFirebaseEmail(null);
        setUserBio('');
        setSignedInUser(null);
        setUserAvatar('initials');
      }
    });

    return () => unsubscribe();
  }, []);

  // Mark Firebase presence offline when closing or leaving the page
  useEffect(() => {
    if (!firebaseUid) return;
    const handlePageHide = () => {
      void setFirestorePresenceOffline(firebaseUid).catch(() => {
        // Ignore network errors during unload
      });
    };
    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, [firebaseUid]);

  const handleSignOut = async () => {
    const uidToSignOut = firebaseUid;
    localStorage.removeItem('k1ngkell_signed_in_user');
    localStorage.removeItem('k1ngkell_auth_mode');
    localStorage.removeItem('k1ngkell_gate_unlocked');
    localStorage.removeItem('k1ngkell_captcha_verified');
    localStorage.removeItem('k1ngkell_user_avatar');
    setSignedInUser(null);
    setUserAvatar('initials');
    setFirebaseUid(null);
    setFirebaseEmail(null);
    setUserBio('');
    if (uidToSignOut) {
      try {
        await setFirestorePresenceOffline(uidToSignOut);
      } catch {
        // Best-effort offline status update
      }
      try {
        await signOut(auth);
      } catch {
        // Ignore signOut errors
      }
    }
  };

  const handleSignInSuccess = (
    username: string,
    avatar?: string,
    firebaseInfo?: FirebaseSignInInfo
  ) => {
    if (firebaseInfo) {
      localStorage.setItem('k1ngkell_auth_mode', 'firebase');
      localStorage.setItem('k1ngkell_signed_in_user', username);
      setFirebaseUid(firebaseInfo.uid);
      setFirebaseEmail(firebaseInfo.email || null);
      setUserBio(firebaseInfo.bio || '');
      setUserAvatar(avatar || pickDistinctAvatarForAccount(firebaseInfo.uid));
      setSignedInUser(username);
      setShowSignInModal(false);
      return;
    }

    localStorage.setItem('k1ngkell_auth_mode', 'local');
    localStorage.setItem('k1ngkell_signed_in_user', username);
    const acct = getAccount(username);
    const resolvedAvatar =
      avatar || acct?.avatar || pickDistinctAvatarForAccount(username);
    setFirebaseUid(null);
    setFirebaseEmail(null);
    setUserBio('');
    setUserAvatar(resolvedAvatar);
    setSignedInUser(username);
    setShowSignInModal(false);
  };

  const handleGoogleAccountSignedIn = (info: {
    uid: string;
    email: string;
    username: string;
    bio: string;
    avatar: string;
  }) => {
    localStorage.setItem('k1ngkell_auth_mode', 'firebase');
    localStorage.setItem('k1ngkell_signed_in_user', info.username);
    setFirebaseUid(info.uid);
    setFirebaseEmail(info.email || null);
    setUserBio(info.bio || '');
    setUserAvatar(info.avatar || pickDistinctAvatarForAccount(info.uid));
    setSignedInUser(info.username);
    setShowSignInModal(false);
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
              faviconUrl: undefined,
              isPlayingAudio: false,
              isMuted: false,
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
        let results: EmbedSearchResult[] = [];
        let summary = '';
        let serverSearchSucceeded = false;

        try {
          const res = await fetch('/api/web-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: input, engine: searchEngine }),
          });
          const contentType = res.headers.get('content-type') || '';
          if (res.ok && contentType.includes('application/json')) {
            const data = await res.json();
            results = Array.isArray(data.results) ? data.results : [];
            summary = data.instantSummary || '';
            serverSearchSucceeded = true;
          }
        } catch {
          // Static hosting (e.g. GitHub Pages) has no /api server route
        }

        if (!serverSearchSucceeded) {
          try {
            const ddgRes = await fetch(
              `https://api.duckduckgo.com/?q=${encodeURIComponent(
                input
              )}&format=json&no_html=1&skip_disambig=1`
            );
            if (ddgRes.ok) {
              const ddgData = await ddgRes.json();
              if (ddgData?.AbstractText) {
                summary = ddgData.AbstractText;
              }
              if (ddgData?.AbstractURL && !/wikipedia\.org/i.test(ddgData.AbstractURL)) {
                results.push({
                  title: ddgData.Heading || input,
                  snippet: ddgData.AbstractText || `Official result for ${input}.`,
                  url: ddgData.AbstractURL,
                  source: ddgData.AbstractSource || searchEngine,
                });
              }
              if (Array.isArray(ddgData?.RelatedTopics)) {
                for (const topic of ddgData.RelatedTopics.slice(0, 6)) {
                  if (topic?.Text && topic?.FirstURL) {
                    results.push({
                      title: topic.Text.split(' - ')[0] || topic.Text.slice(0, 60),
                      snippet: topic.Text,
                      url: topic.FirstURL,
                      source: searchEngine,
                    });
                  }
                }
              }
            }
          } catch {
            // Public instant-answer lookup unavailable
          }
        }

        const engineEmbedUrl =
          searchEngine === 'google'
            ? `https://www.google.com/search?igu=1&q=${encodeURIComponent(input)}`
            : searchEngine === 'bing'
            ? `https://www.bing.com/search?q=${encodeURIComponent(input)}`
            : '';

        // Pick the top real web link (never force Wikipedia over web results),
        // or open the selected embeddable search engine results page when available
        const preferredUrl = results[0]?.url || engineEmbedUrl;
        const preferredTitle = results[0]?.title || `${searchEngine.toUpperCase()}: ${input}`;

        if (preferredUrl) {
          const { url } = normalizeEmbedUrl(preferredUrl);
          setEmbedTabs((prev) =>
            prev.map((t) => {
              if (t.id !== tabId) return t;
              const nextHistory = [...t.history.slice(0, t.historyIndex + 1), url];
              return {
                ...t,
                title: preferredTitle,
                url,
                faviconUrl: undefined,
                isPlayingAudio: false,
                isMuted: false,
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

  const handleReorderEmbedTabs = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    setEmbedTabs((prev) => {
      if (fromIndex >= prev.length || toIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

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
        signedInUser={signedInUser}
        userAvatar={userAvatar}
        onOpenSignIn={() => setShowSignInModal(true)}
        onSignOut={handleSignOut}
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

        {activeTab === 'music' && (
          <MusicTab
            isSignedIn={Boolean(signedInUser)}
            onRequireSignIn={() => setShowSignInModal(true)}
            firebaseUid={firebaseUid}
          />
        )}

        {activeTab === 'cinema' && <CinemaTab />}

        {activeTab === 'chat' && (
          <ChatTab
            isSignedIn={Boolean(signedInUser)}
            signedInUsername={signedInUser}
            userAvatar={userAvatar}
            onRequireSignIn={() => setShowSignInModal(true)}
            onOpenAvatarSettings={() => setActiveTab('settings')}
            firebaseUid={firebaseUid}
            onUpdateSignedInUser={(newUsername) => setSignedInUser(newUsername)}
          />
        )}

        {activeTab === 'ai' && (
          <AiAssistantTab
            customApiKey={customApiKey}
            setCustomApiKey={setCustomApiKey}
          />
        )}

        {activeTab === 'security' && (
          <SecurityTab
            isSignedIn={Boolean(signedInUser)}
            onOpenSignIn={() => setShowSignInModal(true)}
            onLockGate={handleSignOut}
            onOpenAccountSettings={() => setActiveTab('settings')}
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
            signedInUser={signedInUser}
            userAvatar={userAvatar}
            setUserAvatar={setUserAvatar}
            onOpenSignIn={() => setShowSignInModal(true)}
            onSignOut={handleSignOut}
            onUpdateSignedInUser={(newUsername) => setSignedInUser(newUsername)}
            firebaseUid={firebaseUid}
            firebaseEmail={firebaseEmail}
            userBio={userBio}
            onUpdateUserBio={setUserBio}
            onGoogleAccountSignedIn={handleGoogleAccountSignedIn}
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
          onReorderTabs={handleReorderEmbedTabs}
          onExitToPortal={() => setIsEmbedOpen(false)}
        />
      )}

      {showSignInModal && (
        <SignInGate
          logoStyle={logoStyle}
          onUnlock={handleSignInSuccess}
          onCancel={() => setShowSignInModal(false)}
        />
      )}
    </BackgroundWrapper>
  );
}
