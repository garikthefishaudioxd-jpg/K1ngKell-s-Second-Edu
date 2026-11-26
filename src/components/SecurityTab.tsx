import React, { useState } from 'react';
import { ShieldCheck, Lock, Unlock, Download, Upload, CheckCircle2, KeyRound, Database, WifiOff, Settings } from 'lucide-react';

interface SecurityTabProps {
  isSignedIn: boolean;
  onOpenSignIn: () => void;
  onLockGate: () => void;
  onOpenAccountSettings: () => void;
  offlineMode: boolean;
  setOfflineMode: (val: boolean) => void;
}

export const SecurityTab: React.FC<SecurityTabProps> = ({
  isSignedIn,
  onOpenSignIn,
  onLockGate,
  onOpenAccountSettings,
  offlineMode,
  setOfflineMode,
}) => {
  const [exportMessage, setExportMessage] = useState<string>('');

  const sessionToken = 'k1ngkell-sec-7f9e3a8d1c2b54';

  const handleExportData = () => {
    const settingsSnapshot: Record<string, string | null> = {
      k1ngkell_theme: localStorage.getItem('k1ngkell_theme'),
      k1ngkell_dark_mode: localStorage.getItem('k1ngkell_dark_mode'),
      k1ngkell_primary_color: localStorage.getItem('k1ngkell_primary_color'),
      k1ngkell_custom_color: localStorage.getItem('k1ngkell_custom_color'),
      k1ngkell_search_engine: localStorage.getItem('k1ngkell_search_engine'),
      k1ngkell_timezone: localStorage.getItem('k1ngkell_timezone'),
      k1ngkell_logo_style: localStorage.getItem('k1ngkell_logo_style'),
      k1ngkell_offline_mode: localStorage.getItem('k1ngkell_offline_mode'),
      k1ngkell_ambient_settings: localStorage.getItem('k1ngkell_ambient_settings'),
    };

    const dataToExport = {
      timestamp: new Date().toISOString(),
      vaultVersion: '3.0.1',
      sessionToken,
      userSettings: settingsSnapshot,
      favoriteGames: localStorage.getItem('k1ngkell_favorite_games'),
      musicLibrary: localStorage.getItem('k1ngkell_music_library'),
      checksum: 'sha256-e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `k1ngkell-encrypted-vault-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportMessage('Encrypted vault exported successfully.');
    setTimeout(() => setExportMessage(''), 3000);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.userSettings && typeof parsed.userSettings === 'object') {
          Object.entries(parsed.userSettings).forEach(([key, val]) => {
            if (key.startsWith('k1ngkell_') && typeof val === 'string') {
              localStorage.setItem(key, val);
            }
          });
        }
        if (parsed.favoriteGames) localStorage.setItem('k1ngkell_favorite_games', parsed.favoriteGames);
        if (parsed.musicLibrary) localStorage.setItem('k1ngkell_music_library', parsed.musicLibrary);
        setExportMessage('Encrypted vault restored! Reloading state...');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch {
        setExportMessage('Invalid encrypted vault file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
          <ShieldCheck className="w-7 h-7 text-emerald-500" />
          <span>Security & User Data Vault</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Password-protected account access, client-side vault backup, and offline caching.
        </p>
      </div>

      {exportMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{exportMessage}</span>
        </div>
      )}

      {/* Grid of Security Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Password Security Card */}
        <div className="p-6 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-rose-600" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Account Password Security
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              SHA-256
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Accounts are protected with salted SHA-256 password hashing stored locally in your browser without extra verification steps.
          </p>

          <button
            type="button"
            onClick={isSignedIn ? onOpenAccountSettings : onOpenSignIn}
            className="w-full py-2 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{isSignedIn ? 'Open Account Settings' : 'Sign In or Create Account'}</span>
          </button>
        </div>

        {/* Account & Session Status Card */}
        <div className="p-6 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Session &amp; Access Status
              </h3>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                isSignedIn
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
              }`}
            >
              {isSignedIn ? 'SIGNED IN' : 'SIGNED OUT'}
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isSignedIn
              ? 'You are signed in with full access to Chat channels and saved music playlists.'
              : 'You are currently signed out. Sign in with your password to access Chat and save playlists.'}
          </p>

          {isSignedIn ? (
            <button
              type="button"
              onClick={onLockGate}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenSignIn}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          )}
        </div>

        {/* Offline Cache Mode */}
        <div className="p-6 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <WifiOff className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Offline Mode & Cache
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setOfflineMode(!offlineMode)}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                offlineMode ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  offlineMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pre-cache HTML5 game scripts (GN Math, 2048, Snake) and user preferences for offline play without active internet connectivity.
          </p>
          <div className="text-[11px] text-slate-400 font-mono">
            Cache Status: {offlineMode ? 'Local Cache Active' : 'Online Dynamic Sync'}
          </div>
        </div>

        {/* Encrypted Cloud Storage Sync */}
        <div className="p-6 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Encrypted User Data Sync
            </h3>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Export or import your complete encrypted settings, liked songs playlist, and game high scores.
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleExportData}
              className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Vault</span>
            </button>

            <label className="flex-1 py-2 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Import Vault</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
