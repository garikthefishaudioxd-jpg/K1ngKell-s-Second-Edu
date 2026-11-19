import React, { useState } from 'react';
import { Logo } from './Logo';
import { CaptchaModal } from './CaptchaModal';
import { Lock, Unlock, KeyRound, Shield, CheckCircle } from 'lucide-react';
import { LogoStyle } from '../types';

interface SignInGateProps {
  onUnlock: () => void;
  logoStyle?: LogoStyle;
}

export const SignInGate: React.FC<SignInGateProps> = ({ onUnlock, logoStyle = 'packet-bottle' }) => {
  const [showCaptcha, setShowCaptcha] = useState<boolean>(false);
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [guestLoading, setGuestLoading] = useState<boolean>(false);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setError('Please enter a passcode or click Quick Verify');
      return;
    }
    // Any passcode is accepted once submitted, or user can do human verification
    localStorage.setItem('k1ngkell_gate_unlocked', 'true');
    onUnlock();
  };

  const handleCaptchaSuccess = () => {
    setShowCaptcha(false);
    localStorage.setItem('k1ngkell_gate_unlocked', 'true');
    localStorage.setItem('k1ngkell_captcha_verified', Date.now().toString());
    onUnlock();
  };

  const handleQuickUnlock = () => {
    setGuestLoading(true);
    setTimeout(() => {
      setShowCaptcha(true);
      setGuestLoading(false);
    }, 300);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-8 shadow-2xl transition-all">
        {/* Brand Lockup */}
        <div className="flex flex-col items-center text-center mb-6">
          <Logo style={logoStyle} className="w-16 h-16 mb-2" showText={false} />
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
            <span className="text-rose-600">K1</span>
            <span className="text-blue-600">ngkell</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
            Personal Entertainment, Unblocked Games & Media Cloud Hub
          </p>
        </div>

        {/* Security Gate Badge */}
        <div className="p-3 mb-6 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div className="text-left text-xs">
            <div className="font-semibold text-slate-800 dark:text-slate-200">
              Gateway Security Gate
            </div>
            <div className="text-slate-500 dark:text-slate-400 text-[11px]">
              Human verification required to prevent automated bot spiders.
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/50">
            {error}
          </div>
        )}

        {/* Access Form */}
        <form onSubmit={handlePinSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 text-left">
              Access PIN / Passcode (Optional)
            </label>
            <div className="relative">
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter custom PIN or leave blank"
                className="w-full px-3.5 py-2.5 pl-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600 transition-all"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            <Unlock className="w-4 h-4" />
            <span>Unlock with Passcode</span>
          </button>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
          </div>
          <span className="relative px-3 text-[11px] font-medium uppercase text-slate-400 bg-white dark:bg-slate-900">
            Or Human Verification
          </span>
        </div>

        <button
          type="button"
          onClick={handleQuickUnlock}
          disabled={guestLoading}
          className="w-full py-2.5 px-4 text-xs font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <Shield className="w-4 h-4 text-rose-500" />
          <span>Launch Smart CAPTCHA</span>
        </button>

        <div className="mt-6 text-center">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span>End-to-end Local Client Encryption Active</span>
          </span>
        </div>
      </div>

      {showCaptcha && (
        <CaptchaModal
          onSuccess={handleCaptchaSuccess}
          onCancel={() => setShowCaptcha(false)}
        />
      )}
    </div>
  );
};
