import React from 'react';
import { ActiveTab, LogoStyle } from '../types';
import { Logo } from './Logo';
import { Moon, Sun, Lock, Globe } from 'lucide-react';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  logoStyle: LogoStyle;
  onLockGate: () => void;
  embedTabsCount?: number;
  onResumeEmbed?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  darkMode,
  setDarkMode,
  logoStyle,
  onLockGate,
  embedTabsCount = 0,
  onResumeEmbed,
}) => {
  const navTabs: { id: ActiveTab; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'games', label: 'Games' },
    { id: 'music', label: 'Music' },
    { id: 'cinema', label: 'Cinema' },
    { id: 'chat', label: 'Chat' },
    { id: 'ai', label: 'AI Assistant' },
    { id: 'security', label: 'Security' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Brand Wordmark */}
        <button
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-2 text-left focus:outline-hidden group shrink-0"
        >
          <Logo style={logoStyle} className="w-8 h-8 group-hover:scale-105 transition-transform" />
        </button>

        {/* Zone 2: Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-1 scrollbar-none">
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 transition-all ${
                  isActive
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action Group */}
        <div className="flex items-center gap-2 shrink-0">
          {embedTabsCount > 0 && onResumeEmbed && (
            <button
              onClick={onResumeEmbed}
              title="Return to Open Embed Tabs"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Tabs ({embedTabsCount})</span>
            </button>
          )}
          <button
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={onLockGate}
            title="Lock Portal Gate"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Lock className="w-3.5 h-3.5 text-rose-500" />
            <span>Lock</span>
          </button>
        </div>
      </div>
    </header>
  );
};
