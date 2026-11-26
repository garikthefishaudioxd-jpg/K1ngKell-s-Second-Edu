import React, { useState } from 'react';
import { Logo } from './Logo';
import { UserAvatar, AVATAR_PRESETS } from './UserAvatar';
import { Lock, Unlock, KeyRound, CheckCircle, User, X, Eye, EyeOff, UserPlus, Check } from 'lucide-react';
import { LogoStyle } from '../types';
import {
  authenticateAccount,
  hasAnyAccounts,
  pickDistinctAvatarForAccount,
  registerAccount,
} from '../utils/accountAuth';

interface SignInGateProps {
  onUnlock: (username: string, avatar?: string) => void;
  onCancel?: () => void;
  logoStyle?: LogoStyle;
}

export const SignInGate: React.FC<SignInGateProps> = ({
  onUnlock,
  onCancel,
  logoStyle = 'packet-bottle',
}) => {
  const [mode, setMode] = useState<'signin' | 'register'>(() =>
    hasAnyAccounts() ? 'signin' : 'register'
  );
  const [username, setUsername] = useState<string>(() =>
    hasAnyAccounts() ? localStorage.getItem('k1ngkell_chat_username') || '' : ''
  );
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(() =>
    pickDistinctAvatarForAccount('new-member')
  );
  const [avatarManuallyPicked, setAvatarManuallyPicked] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleModeSwitch = (nextMode: 'signin' | 'register') => {
    setMode(nextMode);
    setError('');
    setPassword('');
    setConfirmPassword('');
    if (nextMode === 'register') {
      setUsername('');
      setAvatarManuallyPicked(false);
      setSelectedAvatar(pickDistinctAvatarForAccount(`account-${Date.now()}`));
    } else {
      setUsername(localStorage.getItem('k1ngkell_chat_username') || '');
    }
  };

  const handleUsernameChange = (nextName: string) => {
    setUsername(nextName);
    if (mode === 'register' && !avatarManuallyPicked && nextName.trim()) {
      setSelectedAvatar(pickDistinctAvatarForAccount(nextName));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      setSubmitting(true);
      const res = await registerAccount(username, password, selectedAvatar);
      setSubmitting(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onUnlock(res.account.username, res.account.avatar);
      return;
    }

    setSubmitting(true);
    const res = await authenticateAccount(username, password);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onUnlock(res.account.username, res.account.avatar);
  };

  return (
    <div className="fixed inset-0 z-50 w-full h-full flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-7 shadow-2xl transition-all my-auto">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            title="Stay signed out"
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Brand Lockup */}
        <div className="flex flex-col items-center text-center mb-4">
          <Logo style={logoStyle} className="w-14 h-14 mb-2" showText={false} />
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
            <span className="text-rose-600">K1</span>
            <span className="text-blue-600">ngkell</span> Account
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
            Sign in with your username and password to access Chat channels and saved playlists.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-1.5 p-1 mb-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => handleModeSwitch('signin')}
            className={`py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'signin'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Unlock className="w-3.5 h-3.5 text-blue-600" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('register')}
            className={`py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'register'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-rose-600" />
            <span>Create Account</span>
          </button>
        </div>

        {/* Account Badge */}
        <div className="p-3 mb-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-center gap-3">
          {mode === 'register' ? (
            <UserAvatar
              avatar={selectedAvatar}
              name={username || 'Member'}
              size="md"
              className="ring-2 ring-rose-500/30"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
          )}
          <div className="text-left text-xs">
            <div className="font-semibold text-slate-800 dark:text-slate-200">
              {mode === 'register' ? 'Create Your Account' : 'Password Sign In'}
            </div>
            <div className="text-slate-500 dark:text-slate-400 text-[11px]">
              {mode === 'register'
                ? 'Pick a unique avatar, username, and password for this account.'
                : 'Enter your registered username and password to continue.'}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/50">
            {error}
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 text-left">
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                maxLength={32}
                placeholder="Enter your username"
                autoComplete="username"
                className="w-full px-3.5 py-2.5 pl-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600 transition-all"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 text-left">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Create a password (min 4 characters)' : 'Enter your password'}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                className="w-full px-3.5 py-2.5 pl-10 pr-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600 transition-all"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                title={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 text-left">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    className="w-full px-3.5 py-2.5 pl-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600 transition-all"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 text-left">
                  Starting Profile Avatar
                </label>
                <div className="grid grid-cols-6 gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                  {AVATAR_PRESETS.filter((p) => p.id !== 'initials').map((preset) => {
                    const isSelected = selectedAvatar === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        title={preset.label}
                        onClick={() => {
                          setSelectedAvatar(preset.id);
                          setAvatarManuallyPicked(true);
                        }}
                        className={`relative flex items-center justify-center p-1 rounded-lg transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-rose-500/15 ring-2 ring-rose-500'
                            : 'hover:bg-slate-200/70 dark:hover:bg-slate-800'
                        }`}
                      >
                        <UserAvatar avatar={preset.id} name={username || 'M'} size="sm" />
                        {isSelected && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-600 text-white flex items-center justify-center">
                            <Check className="w-2 h-2 stroke-[3]" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {mode === 'register' ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>{submitting ? 'Creating Account...' : 'Create Account & Sign In'}</span>
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                <span>{submitting ? 'Signing In...' : 'Sign In with Password'}</span>
              </>
            )}
          </button>
        </form>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-3 w-full py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            Continue Signed Out
          </button>
        )}

        <div className="mt-3 text-center">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span>SHA-256 Salted Password Storage</span>
          </span>
        </div>
      </div>
    </div>
  );
};
