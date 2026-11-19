import React, { useState } from 'react';
import { ActiveTab, SearchEngine, LogoStyle } from '../types';
import { Logo } from './Logo';
import { Search, Gamepad2, Music2, Film, MessageSquare, Sparkles, ShieldCheck, Play, ArrowRight, Zap, ExternalLink } from 'lucide-react';
import { GAMES_DATA } from '../data/games';
import { MUSIC_CATALOG } from '../data/music';
import { MOVIES_DATA } from '../data/movies';

interface HomeTabProps {
  setActiveTab: (tab: ActiveTab) => void;
  searchEngine: SearchEngine;
  setSearchEngine: (engine: SearchEngine) => void;
  logoStyle: LogoStyle;
  onLaunchGame: (gameId: string) => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  setActiveTab,
  searchEngine,
  setSearchEngine,
  logoStyle,
  onLaunchGame,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const searchEngineUrls: Record<SearchEngine, string> = {
    google: 'https://www.google.com/search?q=',
    duckduckgo: 'https://duckduckgo.com/?q=',
    bing: 'https://www.bing.com/search?q=',
    brave: 'https://search.brave.com/search?q=',
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const url = `${searchEngineUrls[searchEngine]}${encodeURIComponent(searchQuery)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-12">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-6 pt-4">
        <div className="flex justify-center">
          <Logo style={logoStyle} className="w-20 h-20 hover:scale-105 transition-transform" showText={false} />
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
            <span className="text-rose-600">K1</span>
            <span className="text-blue-600">ngkell</span> Portal
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
            Your high-performance entertainment dashboard. Seamlessly explore browser games, stream SoundCloud mixes, watch licensed cinema, and chat with AI.
          </p>
        </div>

        {/* Universal Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative max-w-2xl mx-auto">
          <div className="relative flex items-center shadow-lg rounded-2xl overflow-hidden bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 transition-all focus-within:ring-2 focus-within:ring-rose-500">
            <div className="pl-4 text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search with ${searchEngine.toUpperCase()} or explore K1ngkell...`}
              className="w-full px-4 py-3.5 bg-transparent text-slate-900 dark:text-white text-sm focus:outline-hidden"
            />
            {/* Search Engine Selector Dropdown */}
            <div className="pr-2 flex items-center gap-1.5 shrink-0">
              <select
                value={searchEngine}
                onChange={(e) => setSearchEngine(e.target.value as SearchEngine)}
                className="text-xs font-semibold py-1.5 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none focus:outline-hidden cursor-pointer"
              >
                <option value="google">Google</option>
                <option value="duckduckgo">DuckDuckGo</option>
                <option value="bing">Bing</option>
                <option value="brave">Brave</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-rose-600 to-blue-600 hover:from-rose-700 hover:to-blue-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1"
              >
                <span>Search</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </form>

        {/* Quick Launch Action Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setActiveTab('games')}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-xs"
          >
            <Gamepad2 className="w-3.5 h-3.5 text-rose-500" />
            <span>Games Vault</span>
          </button>
          <button
            onClick={() => setActiveTab('music')}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-xs"
          >
            <Music2 className="w-3.5 h-3.5 text-blue-500" />
            <span>SoundCloud Stream</span>
          </button>
          <button
            onClick={() => setActiveTab('cinema')}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-xs"
          >
            <Film className="w-3.5 h-3.5 text-amber-500" />
            <span>Open Cinema</span>
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-xs"
          >
            <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
            <span>Discord Chat</span>
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span>K1ngkell AI</span>
          </button>
        </div>
      </div>

      {/* Featured Unblocked Games Strip */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-rose-600" />
              <span>Popular Unblocked & Math Games</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Curated from GN Math, Retro Arcade, and Web Classics
            </p>
          </div>
          <button
            onClick={() => setActiveTab('games')}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1"
          >
            <span>View All Games</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {GAMES_DATA.slice(0, 4).map((game) => (
            <div
              key={game.id}
              onClick={() => {
                onLaunchGame(game.id);
                setActiveTab('games');
              }}
              className="group cursor-pointer rounded-2xl overflow-hidden bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
            >
              <div className="relative h-36 w-full overflow-hidden bg-slate-950">
                <img
                  src={game.thumbnail}
                  alt={game.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute top-2.5 right-2.5 px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-600 text-white uppercase tracking-wider">
                  {game.category}
                </div>
                <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-white">
                  <span className="text-xs font-bold truncate">{game.title}</span>
                  <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                    <Play className="w-3 h-3 fill-white text-white ml-0.5" />
                  </div>
                </div>
              </div>
              <div className="p-3">
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {game.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2-Column Showcase: SoundCloud Streamer & Cinema Spotlight */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SoundCloud Showcase Card */}
        <div className="p-6 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  SoundCloud Beats Lounge
                </h3>
              </div>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                Live Embed Player
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Listen to non-stop Lo-Fi chillhop, synthwave, and gaming soundtracks straight from SoundCloud.
            </p>

            {/* Embedded Mini Player Preview */}
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950">
              <iframe
                width="100%"
                height="166"
                scrolling="no"
                frameBorder="no"
                allow="autoplay"
                src={MUSIC_CATALOG[0].embedUrl}
                title="SoundCloud Player"
                className="w-full"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 mt-4">
            <span className="text-xs text-slate-400">
              {MUSIC_CATALOG.length} Curated Station Mixes
            </span>
            <button
              onClick={() => setActiveTab('music')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>Open Music Tab</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Legal Cinema Showcase Card */}
        <div className="p-6 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Film className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Open License Cinema
                </h3>
              </div>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                100% Legal Public Domain
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              High-definition movies and animations from the Blender Open Movie Foundation and Open Culture vaults.
            </p>

            <div className="relative rounded-xl overflow-hidden h-42 bg-slate-950 border border-slate-200 dark:border-slate-800 group">
              <img
                src={MOVIES_DATA[0].poster}
                alt={MOVIES_DATA[0].title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-4 text-white">
                <span className="text-xs font-bold">{MOVIES_DATA[0].title}</span>
                <span className="text-[11px] text-slate-300">
                  {MOVIES_DATA[0].genre} · {MOVIES_DATA[0].duration} · {MOVIES_DATA[0].license}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 mt-4">
            <span className="text-xs text-slate-400">
              Theater Mode & HD Streams
            </span>
            <button
              onClick={() => setActiveTab('cinema')}
              className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
            >
              <span>Watch Films</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
