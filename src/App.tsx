/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ActiveTab,
  BackgroundTheme,
  PrimaryColor,
  SearchEngine,
  LogoStyle,
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

export default function App() {
  // Gatekeeper state
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return localStorage.getItem('k1ngkell_gate_unlocked') === 'true';
  });

  // Navigation tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

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

  // Save settings when changed
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
  };

  const handleLaunchGame = (gameId: string) => {
    setSelectedGameId(gameId);
    setActiveTab('games');
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
      />

      <main className="flex-1 pb-16">
        {activeTab === 'home' && (
          <HomeTab
            setActiveTab={setActiveTab}
            searchEngine={searchEngine}
            setSearchEngine={setSearchEngine}
            logoStyle={logoStyle}
            onLaunchGame={handleLaunchGame}
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
    </BackgroundWrapper>
  );
}
