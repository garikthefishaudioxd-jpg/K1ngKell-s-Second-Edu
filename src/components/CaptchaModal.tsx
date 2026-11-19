import React, { useState } from 'react';
import { ShieldCheck, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

interface CaptchaModalProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export const CaptchaModal: React.FC<CaptchaModalProps> = ({ onSuccess, onCancel }) => {
  const [sliderVal, setSliderVal] = useState<number>(0);
  const [targetVal] = useState<number>(() => Math.floor(Math.random() * 40) + 40); // 40..80
  const [mathA, setMathA] = useState<number>(() => Math.floor(Math.random() * 8) + 3);
  const [mathB, setMathB] = useState<number>(() => Math.floor(Math.random() * 8) + 2);
  const [mathInput, setMathInput] = useState<string>('');
  const [step, setStep] = useState<'puzzle' | 'math'>('puzzle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const handleSliderRelease = () => {
    // If slider is within +/- 5 of target
    if (Math.abs(sliderVal - targetVal) <= 6) {
      setErrorMsg('');
      setStep('math');
    } else {
      setErrorMsg('Alignment offset too large. Snap the slider closer to the target slot.');
      setSliderVal(0);
    }
  };

  const handleMathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(mathInput.trim(), 10);
    if (parsed === mathA + mathB) {
      setIsVerifying(true);
      setErrorMsg('');
      setTimeout(() => {
        setIsVerifying(false);
        onSuccess();
      }, 700);
    } else {
      setErrorMsg('Incorrect answer. Please recalculate the human security check.');
      setMathInput('');
      setMathA(Math.floor(Math.random() * 8) + 3);
      setMathB(Math.floor(Math.random() * 8) + 2);
    }
  };

  const resetAll = () => {
    setSliderVal(0);
    setMathInput('');
    setErrorMsg('');
    setStep('puzzle');
    setMathA(Math.floor(Math.random() * 8) + 3);
    setMathB(Math.floor(Math.random() * 8) + 2);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-rose-600 dark:text-rose-500" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              K1ngkell Smart CAPTCHA
            </h3>
          </div>
          <button
            onClick={resetAll}
            title="Reset Challenge"
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Advanced multi-stage anti-bot verification. Complete both biometric alignment and the cognitive entropy check to unlock K1ngkell.
        </p>

        {errorMsg && (
          <div className="mt-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2 text-rose-700 dark:text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {step === 'puzzle' ? (
          <div className="mt-5 space-y-4">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Stage 1: Drag puzzle piece to align with target notch</span>
              <span className="font-mono text-slate-400">{sliderVal}%</span>
            </div>

            {/* Visual puzzle canvas representation */}
            <div className="relative h-28 w-full rounded-xl bg-gradient-to-r from-slate-800 via-indigo-950 to-slate-900 overflow-hidden border border-slate-700 p-2 select-none">
              {/* Target notch */}
              <div
                className="absolute top-4 bottom-4 w-12 rounded-lg border-2 border-dashed border-rose-400/80 bg-rose-500/20 flex items-center justify-center pointer-events-none"
                style={{ left: `${targetVal}%`, transform: 'translateX(-50%)' }}
              >
                <span className="text-[10px] font-mono font-bold text-rose-300">SLOT</span>
              </div>

              {/* Movable puzzle block */}
              <div
                className="absolute top-4 bottom-4 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg border border-blue-300/50 flex items-center justify-center transition-transform"
                style={{ left: `${sliderVal}%`, transform: 'translateX(-50%)' }}
              >
                <div className="w-3 h-3 rounded-full bg-white/90 shadow-sm" />
              </div>
            </div>

            <div className="pt-2">
              <input
                type="range"
                min="0"
                max="100"
                value={sliderVal}
                onChange={(e) => setSliderVal(Number(e.target.value))}
                onMouseUp={handleSliderRelease}
                onTouchEnd={handleSliderRelease}
                className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>Slide to notch</span>
                <span>Release to verify</span>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleMathSubmit} className="mt-5 space-y-4">
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                Stage 2: Cognitive Entropy Check
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-wide py-2">
                {mathA} + {mathB} = ?
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Enter Answer
              </label>
              <input
                type="number"
                autoFocus
                value={mathInput}
                onChange={(e) => setMathInput(e.target.value)}
                placeholder="Result"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isVerifying || !mathInput.trim()}
                className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Authorize Access</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
