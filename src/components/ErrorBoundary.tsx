import React from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
  isQuotaError: boolean;
  isDailyReadQuota: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      message: '',
      isQuotaError: false,
      isDailyReadQuota: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const raw = error?.message || 'An unexpected error occurred.';
    let displayMsg = raw;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.error === 'string') {
        displayMsg = parsed.error;
      }
    } catch {
      // plain error message
    }
    const isQuotaError = /Quota exceeded/i.test(displayMsg);
    const isDailyReadQuota = /Free daily read units per project/i.test(displayMsg);
    return {
      hasError: true,
      message: displayMsg,
      isQuotaError,
      isDailyReadQuota,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Application ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const upgradeUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data?openUpgradeDialog=true`;

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100">
        <div className="max-w-md w-full p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-white">Something went wrong</h2>
          <p className="text-xs text-slate-300 leading-relaxed break-words">
            {this.state.message}
          </p>
          {this.state.isQuotaError && (
            <p className="text-[11px] text-amber-300 leading-relaxed">
              Firestore free-tier quota resets tomorrow. Check the Spark plan limits in Firebase Pricing
              {this.state.isDailyReadQuota ? (
                <>
                  {' '}
                  or{' '}
                  <a
                    href={upgradeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-blue-400"
                  >
                    open your Firestore database upgrade options
                  </a>
                </>
              ) : null}
              .
            </p>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Reload App</span>
          </button>
        </div>
      </div>
    );
  }
}
