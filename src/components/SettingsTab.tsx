import React, { useState, useEffect } from 'react';
import { BackgroundTheme, PrimaryColor, SearchEngine, LogoStyle } from '../types';
import {
  Settings,
  Palette,
  Clock,
  Search,
  Image as ImageIcon,
  Upload,
  Sliders,
  Check,
  Cloud,
  User,
  KeyRound,
  LogIn,
  LogOut,
  Trash2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Logo } from './Logo';
import { UserAvatar, AVATAR_PRESETS, resizeAvatarImage } from './UserAvatar';
import { WALLPAPER_MAP } from '../assets/wallpapers';
import {
  changeAccountPassword,
  deleteAccount,
  getAccount,
  updateAccountProfile,
} from '../utils/accountAuth';

interface SettingsTabProps {
  theme: BackgroundTheme;
  setTheme: (t: BackgroundTheme) => void;
  customWallpaperUrl?: string;
  setCustomWallpaperUrl: (url: string) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  primaryColor: PrimaryColor;
  setPrimaryColor: (color: PrimaryColor) => void;
  customColorHex?: string;
  setCustomColorHex: (hex: string) => void;
  searchEngine: SearchEngine;
  setSearchEngine: (engine: SearchEngine) => void;
  timezone: string;
  setTimezone: (tz: string) => void;
  logoStyle: LogoStyle;
  setLogoStyle: (style: LogoStyle) => void;
  signedInUser: string | null;
  userAvatar: string;
  setUserAvatar: (avatar: string) => void;
  onOpenSignIn: () => void;
  onSignOut: () => void;
  onUpdateSignedInUser: (username: string) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  theme,
  setTheme,
  customWallpaperUrl,
  setCustomWallpaperUrl,
  darkMode,
  setDarkMode,
  primaryColor,
  setPrimaryColor,
  customColorHex = '#e11d48',
  setCustomColorHex,
  searchEngine,
  setSearchEngine,
  timezone,
  setTimezone,
  logoStyle,
  setLogoStyle,
  signedInUser,
  userAvatar,
  setUserAvatar,
  onOpenSignIn,
  onSignOut,
  onUpdateSignedInUser,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [saveBanner, setSaveBanner] = useState<boolean>(false);

  // Account Settings State
  const existingAccount = signedInUser ? getAccount(signedInUser) : null;
  const [accountUsername, setAccountUsername] = useState<string>(signedInUser || '');
  const [accountBio, setAccountBio] = useState<string>(existingAccount?.bio || '');
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');
  const [showPasswords, setShowPasswords] = useState<boolean>(false);
  const [accountMessage, setAccountMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState<boolean>(false);

  useEffect(() => {
    if (signedInUser) {
      const acct = getAccount(signedInUser);
      setAccountUsername(signedInUser);
      setAccountBio(acct?.bio || '');
    } else {
      setAccountUsername('');
      setAccountBio('');
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setConfirmDeleteOpen(false);
    setAccountMessage(null);
  }, [signedInUser]);

  const timezones = [
    { label: 'UTC (Coordinated Universal Time)', value: 'UTC' },
    { label: 'America / New York (Eastern)', value: 'America/New_York' },
    { label: 'America / Chicago (Central)', value: 'America/Chicago' },
    { label: 'America / Denver (Mountain)', value: 'America/Denver' },
    { label: 'America / Los Angeles (Pacific)', value: 'America/Los_Angeles' },
    { label: 'Europe / London (GMT)', value: 'Europe/London' },
    { label: 'Europe / Paris (CET)', value: 'Europe/Paris' },
    { label: 'Asia / Tokyo (JST)', value: 'Asia/Tokyo' },
    { label: 'Asia / Dubai (GST)', value: 'Asia/Dubai' },
    { label: 'Australia / Sydney (AEST)', value: 'Australia/Sydney' },
  ];

  useEffect(() => {
    const updateTime = () => {
      try {
        const str = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric',
          hour12: true,
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }).format(new Date());
        setCurrentTime(str);
      } catch {
        setCurrentTime(new Date().toLocaleTimeString());
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [timezone]);

  const handleWallpaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setCustomWallpaperUrl(result);
      setTheme('custom');
      triggerSaveNotice();
    };
    reader.readAsDataURL(file);
  };

  const triggerSaveNotice = () => {
    setSaveBanner(true);
    setTimeout(() => setSaveBanner(false), 2500);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signedInUser) return;
    const res = updateAccountProfile(signedInUser, {
      newUsername: accountUsername,
      bio: accountBio,
    });
    if (!res.ok) {
      setAccountMessage({ type: 'error', text: res.error });
      return;
    }
    onUpdateSignedInUser(res.account.username);
    setAccountMessage({ type: 'success', text: 'Account profile saved.' });
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signedInUser) return;
    if (newPassword !== confirmNewPassword) {
      setAccountMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    const res = await changeAccountPassword(signedInUser, currentPassword, newPassword);
    if (!res.ok) {
      setAccountMessage({ type: 'error', text: res.error });
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setAccountMessage({ type: 'success', text: 'Account password updated.' });
  };

  const handleDeleteAccount = () => {
    if (!signedInUser) return;
    deleteAccount(signedInUser);
    setConfirmDeleteOpen(false);
    onSignOut();
  };

  const handleSelectAvatar = (nextAvatar: string) => {
    setUserAvatar(nextAvatar);
    if (signedInUser) {
      updateAccountProfile(signedInUser, { avatar: nextAvatar });
    }
    setAccountMessage({ type: 'success', text: 'Chat & profile avatar updated!' });
    triggerSaveNotice();
  };

  const handleCustomAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const resized = await resizeAvatarImage(file, 128);
      handleSelectAvatar(resized);
    } catch {
      setAccountMessage({ type: 'error', text: 'Could not process image file. Please try another image.' });
    } finally {
      e.target.value = '';
    }
  };

  const themesList: { id: BackgroundTheme; name: string; preview: string }[] = [
    {
      id: 'sunny-hill',
      name: 'Sunny Hill & Flowers',
      preview: WALLPAPER_MAP['sunny-hill'],
    },
    {
      id: 'sunset-mountain',
      name: 'Sunset & Mountains',
      preview: WALLPAPER_MAP['sunset-mountain'],
    },
    {
      id: 'beach',
      name: 'Paradise Beach',
      preview: WALLPAPER_MAP.beach,
    },
    {
      id: 'city',
      name: 'Metropolis City',
      preview: WALLPAPER_MAP.city,
    },
    {
      id: 'dark',
      name: 'Deep Slate Dark',
      preview: '',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-rose-600" />
            <span>K1ngkell Account &amp; Settings</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Manage your account, password, themes, time zones, search engine, and app logo.
          </p>
        </div>
      </div>

      {saveBanner && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>Settings saved to local storage!</span>
        </div>
      )}

      {/* 0. Account Settings */}
      <div
        id="account-settings"
        className="p-6 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                Account Settings
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {signedInUser
                  ? `Signed in as ${signedInUser}`
                  : 'Sign in to customize your profile, change your password, and sync playlists.'}
              </p>
            </div>
          </div>

          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg self-start sm:self-center ${
              signedInUser
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
            }`}
          >
            {signedInUser ? 'SIGNED IN' : 'SIGNED OUT'}
          </span>
        </div>

        {accountMessage && (
          <div
            className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              accountMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
            }`}
          >
            {accountMessage.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{accountMessage.text}</span>
          </div>
        )}

        {!signedInUser ? (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              You are currently signed out. Sign in or create an account with a password to manage your profile, join Chat, and save playlists.
            </p>
            <button
              type="button"
              onClick={onOpenSignIn}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Create Account</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Profile Details Form */}
              <form onSubmit={handleSaveProfile} className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-500" />
                    <span>Profile Identity</span>
                  </h3>
                  {existingAccount?.createdAt && (
                    <span className="text-[10px] text-slate-400">
                      Joined {new Date(existingAccount.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Display Username
                  </label>
                  <input
                    type="text"
                    value={accountUsername}
                    onChange={(e) => setAccountUsername(e.target.value)}
                    maxLength={32}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Status / Bio
                  </label>
                  <input
                    type="text"
                    value={accountBio}
                    onChange={(e) => setAccountBio(e.target.value)}
                    maxLength={160}
                    placeholder="Add a short status or bio..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer"
                >
                  Save Profile
                </button>
              </form>

              {/* Change Password Form */}
              <form onSubmit={handleChangePassword} className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-rose-500" />
                    <span>Change Password</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowPasswords((prev) => !prev)}
                    className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    {showPasswords ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showPasswords ? 'Hide' : 'Show'}</span>
                  </button>
                </div>

                {existingAccount?.passwordHash && (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Current Password
                    </label>
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      autoComplete="current-password"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    New Password
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 4 characters"
                    autoComplete="new-password"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 px-3 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer"
                >
                  Update Password
                </button>
              </form>
            </div>

            {/* Session & Account Management Footer */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={onSignOut}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                <span>Sign Out</span>
              </button>

              {!confirmDeleteOpen ? (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteOpen(true)}
                  className="px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Account</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                    Remove this account?
                  </span>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
                  >
                    Confirm Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteOpen(false)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* User Avatar Selector */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <UserAvatar
                avatar={userAvatar}
                name={signedInUser || 'Member'}
                size="xl"
                className="ring-2 ring-rose-500/30 shadow-md"
              />
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  Chat &amp; Profile Avatar
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Choose a badge or upload an image to personalize your identity in shared chat rooms.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {userAvatar.startsWith('data:image/') && (
                <button
                  type="button"
                  onClick={() => handleSelectAvatar('initials')}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  Reset
                </button>
              )}
              <label className="px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-rose-500" />
                <span>Upload Avatar</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCustomAvatarUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2.5">
            {AVATAR_PRESETS.map((preset) => {
              const isSelected = userAvatar === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectAvatar(preset.id)}
                  title={preset.label}
                  className={`group flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-rose-600 bg-rose-50/40 dark:bg-rose-950/30 ring-2 ring-rose-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50/60 dark:bg-slate-950/40'
                  }`}
                >
                  <div className="relative">
                    <UserAvatar
                      avatar={preset.id}
                      name={signedInUser || 'Member'}
                      size="md"
                      className="group-hover:scale-105 transition-transform"
                    />
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 truncate w-full text-center">
                    {preset.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 1. Theme & Wallpaper Selector */}
      <div className="p-6 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-rose-600" />
            <h2 className="font-bold text-sm text-slate-900 dark:text-white">
              Background Theme &amp; Wallpaper
            </h2>
          </div>
          <span className="text-xs text-slate-400 capitalize">
            Current: {theme.replace('-', ' ')}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {themesList.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTheme(t.id);
                triggerSaveNotice();
              }}
              className={`group text-left rounded-xl overflow-hidden border-2 transition-all p-1 ${
                theme === t.id
                  ? 'border-rose-600 shadow-md ring-2 ring-rose-500/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
              }`}
            >
              <div className="h-20 w-full rounded-lg bg-slate-950 overflow-hidden relative">
                {t.preview ? (
                  <img
                    src={t.preview}
                    alt={t.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-900 flex items-center justify-center text-xs text-slate-400 font-mono">
                    Dark Slate
                  </div>
                )}
                {theme === t.id && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-sm">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </div>
              <div className="px-1.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate mt-1">
                {t.name}
              </div>
            </button>
          ))}
        </div>

        {/* Custom Theme Upload */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-white block">
              Upload Your Own Custom Theme
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Upload any personal photo (JPG, PNG, WebP) to use as background wallpaper.
            </span>
          </div>

          <label className="px-4 py-2 text-xs font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-2 cursor-pointer shrink-0">
            <Upload className="w-4 h-4 text-rose-500" />
            <span>Upload Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleWallpaperUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* 2. Color Palette & Dark Mode */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Accent Color Picker */}
        <div className="p-6 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-sm text-slate-900 dark:text-white">
              Accent Color Palette
            </h2>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select the brand accent color or pick a custom hexadecimal color code.
          </p>

          <div className="flex items-center gap-3">
            {[
              { id: 'rose-red', hex: '#e11d48' },
              { id: 'royal-blue', hex: '#2563eb' },
              { id: 'emerald', hex: '#059669' },
              { id: 'violet', hex: '#7c3aed' },
              { id: 'amber', hex: '#d97706' },
            ].map((col) => (
              <button
                key={col.id}
                onClick={() => {
                  setPrimaryColor(col.id as PrimaryColor);
                  setCustomColorHex(col.hex);
                  triggerSaveNotice();
                }}
                className={`w-8 h-8 rounded-full transition-transform flex items-center justify-center ${
                  primaryColor === col.id ? 'scale-110 ring-2 ring-offset-2 ring-slate-400' : 'hover:scale-105'
                }`}
                style={{ backgroundColor: col.hex }}
              >
                {primaryColor === col.id && <Check className="w-4 h-4 text-white stroke-[3]" />}
              </button>
            ))}

            {/* Custom Color Input */}
            <div className="flex items-center gap-2 ml-2 pl-3 border-l border-slate-200 dark:border-slate-700">
              <input
                type="color"
                value={customColorHex}
                onChange={(e) => {
                  setCustomColorHex(e.target.value);
                  triggerSaveNotice();
                }}
                className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                title="Custom color picker"
              />
              <span className="text-xs font-mono text-slate-500">{customColorHex}</span>
            </div>
          </div>
        </div>

        {/* Light / Dark Mode Toggle */}
        <div className="p-6 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-500" />
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                Display Theme Mode
              </h2>
            </div>
            <button
              onClick={() => {
                setDarkMode(!darkMode);
                triggerSaveNotice();
              }}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                darkMode ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  darkMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            {darkMode
              ? 'Dark mode is currently enabled for reduced eye strain.'
              : 'Light mode is currently enabled with high contrast.'}
          </p>
        </div>
      </div>

      {/* 3. Timezone & Search Engine Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Timezone Selector */}
        <div className="p-6 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-rose-600" />
            <h2 className="font-bold text-sm text-slate-900 dark:text-white">
              Time Zone Selection
            </h2>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
            <span className="text-slate-400 block mb-0.5">Live Local Clock:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
              {currentTime}
            </span>
          </div>

          <select
            value={timezone}
            onChange={(e) => {
              setTimezone(e.target.value);
              triggerSaveNotice();
            }}
            className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
          >
            {timezones.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        {/* Default Search Engine */}
        <div className="p-6 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-sm text-slate-900 dark:text-white">
              Default Search Engine
            </h2>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Choose which provider executes searches from the K1ngkell home search bar.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {(['google', 'duckduckgo', 'bing', 'brave'] as SearchEngine[]).map((engine) => (
              <button
                key={engine}
                onClick={() => {
                  setSearchEngine(engine);
                  triggerSaveNotice();
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-colors capitalize ${
                  searchEngine === engine
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                {engine}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Logo Style Selector */}
      <div className="p-6 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-purple-600" />
          <h2 className="font-bold text-sm text-slate-900 dark:text-white">
            App Logo Customization
          </h2>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Signature packet-bottle emblem for K1ngkell, or switch between alternative badge styles.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { id: 'packet-bottle', label: 'Packet Bottle (Default)' },
            { id: 'cyber-badge', label: 'Cyber Hex Badge' },
            { id: 'neon-crest', label: 'Neon Crown Crest' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setLogoStyle(item.id as LogoStyle);
                triggerSaveNotice();
              }}
              className={`p-4 rounded-xl border text-center transition-all flex flex-col items-center gap-3 ${
                logoStyle === item.id
                  ? 'border-rose-600 bg-rose-50/20 dark:bg-rose-950/20 ring-2 ring-rose-500/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
              }`}
            >
              <Logo style={item.id as LogoStyle} className="w-12 h-12" showText={false} />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 5. Deployment / Hosting Info Note */}
      <div className="p-6 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
          <Cloud className="w-4 h-4 text-blue-500" />
          <h3 className="font-bold text-xs uppercase tracking-wider">
            GitHub Pages &amp; Static Hosting Ready
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          K1ngkell builds with relative asset paths (<code className="font-mono text-rose-500">base: &apos;./&apos;</code>) so the compiled <code className="font-mono text-blue-500">dist/</code> bundle from <code className="font-mono text-rose-500">npm run build</code> works seamlessly on GitHub Pages (<code className="font-mono text-blue-500">gh-pages</code> or GitHub Actions setup in repository Settings → Pages) as well as static buckets like <code className="font-mono text-blue-500">s3.amazonaws.com</code>.
        </p>
      </div>
    </div>
  );
};
