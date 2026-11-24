import React, { useState, useEffect } from 'react';
import { EmbedTabItem, EmbedSearchResult, SearchEngine, LogoStyle } from '../types';
import { Logo } from './Logo';
import {
  Plus,
  X,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Search,
  Globe,
  Home,
  List,
  Maximize2,
  RefreshCw,
  Sparkles,
  BookOpen,
} from 'lucide-react';

interface EmbedWorkspaceProps {
  tabs: EmbedTabItem[];
  activeTabId: string | null;
  searchEngine: SearchEngine;
  logoStyle: LogoStyle;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: () => void;
  onNavigateInTab: (tabId: string, input: string) => void;
  onUpdateTab: (tabId: string, patch: Partial<EmbedTabItem>) => void;
  onExitToPortal: () => void;
}

export const EmbedWorkspace: React.FC<EmbedWorkspaceProps> = ({
  tabs,
  activeTabId,
  searchEngine,
  logoStyle,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onNavigateInTab,
  onUpdateTab,
  onExitToPortal,
}) => {
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0] || null;
  const [omniboxValue, setOmniboxValue] = useState<string>('');
  const [reloadNonce, setReloadNonce] = useState<number>(0);

  useEffect(() => {
    if (activeTab) {
      if (activeTab.viewMode === 'newtab') {
        setOmniboxValue('');
      } else {
        setOmniboxValue(activeTab.url || activeTab.query || '');
      }
    }
  }, [activeTab?.id, activeTab?.url, activeTab?.query, activeTab?.viewMode]);

  if (!activeTab) return null;

  const canGoBack = activeTab.historyIndex > 0;
  const canGoForward = activeTab.historyIndex < activeTab.history.length - 1;

  const handleBack = () => {
    if (!canGoBack) return;
    const prevIdx = activeTab.historyIndex - 1;
    const prevUrl = activeTab.history[prevIdx];
    onUpdateTab(activeTab.id, {
      url: prevUrl,
      historyIndex: prevIdx,
      viewMode: 'embed',
    });
  };

  const handleForward = () => {
    if (!canGoForward) return;
    const nextIdx = activeTab.historyIndex + 1;
    const nextUrl = activeTab.history[nextIdx];
    onUpdateTab(activeTab.id, {
      url: nextUrl,
      historyIndex: nextIdx,
      viewMode: 'embed',
    });
  };

  const handleOmniboxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = omniboxValue.trim();
    if (!val) return;
    onNavigateInTab(activeTab.id, val);
  };

  const handleOpenResultInTab = (result: EmbedSearchResult, openAsNewTab: boolean) => {
    if (openAsNewTab) {
      // Create via parent navigation helper by triggering new tab or direct update
      onNavigateInTab('__new__', result.url);
    } else {
      const nextHistory = [
        ...activeTab.history.slice(0, activeTab.historyIndex + 1),
        result.url,
      ];
      onUpdateTab(activeTab.id, {
        title: result.title,
        url: result.url,
        viewMode: 'embed',
        history: nextHistory,
        historyIndex: nextHistory.length - 1,
      });
    }
  };

  const quickBookmarks = [
    { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Main_Page' },
    { label: 'Internet Archive', url: 'https://archive.org' },
    { label: 'OpenStreetMap', url: 'https://www.openstreetmap.org/export/embed.html' },
    { label: 'CodePen', url: 'https://codepen.io' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 w-screen h-screen overflow-hidden">
      {/* Row 1: Browser-Style Tabs Strip at Top */}
      <div className="h-11 bg-slate-950 border-b border-slate-800 flex items-center px-2 gap-1.5 overflow-x-auto scrollbar-none shrink-0">
        {/* Return to K1ngkell Portal Button */}
        <button
          onClick={onExitToPortal}
          title="Back to K1ngkell Portal"
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-white shrink-0 transition-colors"
        >
          <Logo style={logoStyle} className="w-4 h-4" showText={false} />
          <Home className="w-3.5 h-3.5 text-rose-500" />
          <span className="hidden sm:inline whitespace-nowrap">K1ngkell</span>
        </button>

        <div className="h-5 w-px bg-slate-800 shrink-0 mx-0.5" />

        {/* Open Embed Tabs */}
        <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab.id;
            return (
              <div
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-lg rounded-b-sm text-xs font-medium cursor-pointer transition-colors max-w-[200px] min-w-[110px] shrink-0 border ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-700 border-b-slate-900'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border-transparent'
                }`}
              >
                {tab.isLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-500 shrink-0" />
                ) : (
                  <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                )}
                <span className="truncate flex-1">{tab.title || 'New Tab'}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  title="Close tab"
                  className="p-0.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          {/* Add New Tab Button */}
          <button
            onClick={onNewTab}
            title="New Tab"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Row 2: Address & Search Toolbar */}
      <div className="h-12 bg-slate-900 border-b border-slate-800 px-3 flex items-center gap-2 shrink-0">
        {/* Back / Forward / Reload */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleBack}
            disabled={!canGoBack}
            title="Back"
            className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 disabled:opacity-30 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleForward}
            disabled={!canGoForward}
            title="Forward"
            className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 disabled:opacity-30 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setReloadNonce((n) => n + 1)}
            disabled={!activeTab.url || activeTab.viewMode !== 'embed'}
            title="Reload Embed"
            className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 disabled:opacity-30 transition-colors"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Omnibox: Enter URL or Search */}
        <form onSubmit={handleOmniboxSubmit} className="flex-1 min-w-0">
          <div className="flex items-center bg-slate-950 border border-slate-700/80 focus-within:border-blue-500 rounded-xl px-3 py-1.5 gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={omniboxValue}
              onChange={(e) => setOmniboxValue(e.target.value)}
              placeholder={`Enter any embeddable link (https://...) or search with ${searchEngine.toUpperCase()}...`}
              className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-hidden"
            />
            <button
              type="submit"
              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-rose-600 to-blue-600 hover:from-rose-700 hover:to-blue-700 text-white text-[11px] font-semibold shrink-0"
            >
              Go
            </button>
          </div>
        </form>

        {/* View Mode Switcher & Portal Exit */}
        <div className="flex items-center gap-1.5 shrink-0">
          {activeTab.results && activeTab.results.length > 0 && (
            <button
              onClick={() =>
                onUpdateTab(activeTab.id, {
                  viewMode: activeTab.viewMode === 'embed' ? 'results' : 'embed',
                })
              }
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab.viewMode === 'results'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title="Toggle Search Results List"
            >
              {activeTab.viewMode === 'embed' ? (
                <>
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Results ({activeTab.results.length})</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Show Embed</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={onExitToPortal}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors whitespace-nowrap"
          >
            Portal Home
          </button>
        </div>
      </div>

      {/* Main Full-Screen Viewport */}
      <div className="flex-1 relative w-full h-full bg-slate-950 overflow-hidden">
        {/* Loading Overlay */}
        {activeTab.isLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 text-white gap-3">
            <RefreshCw className="w-7 h-7 animate-spin text-rose-500" />
            <p className="text-xs font-semibold text-slate-300">
              Finding best link and loading full-screen embed...
            </p>
          </div>
        )}

        {/* New Tab Start Page */}
        {activeTab.viewMode === 'newtab' && !activeTab.isLoading && (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-6 overflow-y-auto">
            <Logo style={logoStyle} className="w-16 h-16" showText={false} />
            <div className="space-y-2 max-w-lg">
              <h2 className="text-2xl font-black text-white">
                <span className="text-rose-500">K1</span>
                <span className="text-blue-500">ngkell</span> Full-Screen Embed
              </h2>
              <p className="text-xs text-slate-400">
                Paste any link or enter a search query above. Searches automatically take you straight to the top link inside this full-screen embed.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl">
              {quickBookmarks.map((bm) => (
                <button
                  key={bm.url}
                  onClick={() => onNavigateInTab(activeTab.id, bm.url)}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-2 transition-colors"
                >
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span>{bm.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Results & Summary View (if toggled or if no embeddable URL found) */}
        {activeTab.viewMode === 'results' && !activeTab.isLoading && (
          <div className="w-full h-full overflow-y-auto p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                  <span>
                    Search Results {activeTab.query ? `for "${activeTab.query}"` : ''}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Click any link below to open it full-screen in this tab, or click &ldquo;+ Tab&rdquo; to open it in a new top tab.
                </p>
              </div>
            </div>

            {activeTab.summary && (
              <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-900/60 space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Instant Answer</span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">{activeTab.summary}</p>
              </div>
            )}

            {activeTab.error && (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300">
                {activeTab.error}
              </div>
            )}

            <div className="space-y-3">
              {(activeTab.results || []).map((res, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div
                    onClick={() => handleOpenResultInTab(res, false)}
                    className="cursor-pointer flex-1 min-w-0 space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-blue-400 hover:underline truncate">
                        {res.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">
                        {res.source}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-2">{res.snippet}</p>
                    <div className="text-[11px] font-mono text-slate-500 truncate">{res.url}</div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenResultInTab(res, false)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
                    >
                      Open Embed
                    </button>
                    <button
                      onClick={() => handleOpenResultInTab(res, true)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                    >
                      + Tab
                    </button>
                  </div>
                </div>
              ))}

              {(!activeTab.results || activeTab.results.length === 0) && !activeTab.summary && (
                <div className="p-8 text-center rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
                  No direct embeddable links returned for this query. Try entering a full URL in the address bar above.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Full-Screen Live Iframe Embed */}
        {activeTab.viewMode === 'embed' && activeTab.url && (
          <iframe
            key={`${activeTab.id}-${activeTab.url}-${reloadNonce}`}
            src={activeTab.url}
            title={activeTab.title || 'Embedded Page'}
            className="w-full h-full border-0 bg-white"
            allow="autoplay; fullscreen; clipboard-read; clipboard-write"
          />
        )}
      </div>
    </div>
  );
};
