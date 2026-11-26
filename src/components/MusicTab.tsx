import React, { useState, useEffect } from 'react';
import { TrackItem } from '../types';
import { MUSIC_CATALOG } from '../data/music';
import { Music2, Search, Heart, Play, Plus, Lock, LogIn } from 'lucide-react';
import { AmbientSoundMixer } from './AmbientSoundMixer';
import { SafeImage } from './SafeImage';
import {
  getFirestorePrivateAccount,
  updateFirestoreMusicLibrary,
} from '../services/firebaseAccountService';

interface MusicTabProps {
  isSignedIn: boolean;
  firebaseUid?: string | null;
  onRequireSignIn: () => void;
}

const STORAGE_KEY = 'k1ngkell_music_library';

const loadSavedLibrary = (): TrackItem[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore storage errors
  }
  return MUSIC_CATALOG;
};

export const MusicTab: React.FC<MusicTabProps> = ({
  isSignedIn,
  firebaseUid,
  onRequireSignIn,
}) => {
  const [tracks, setTracks] = useState<TrackItem[]>(() =>
    isSignedIn ? loadSavedLibrary() : MUSIC_CATALOG.map((t) => ({ ...t, isLiked: false }))
  );

  const [activeTrack, setActiveTrack] = useState<TrackItem>(tracks[0] || MUSIC_CATALOG[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [showOnlyLiked, setShowOnlyLiked] = useState<boolean>(false);
  const [customUrl, setCustomUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) {
      const catalogOnly = MUSIC_CATALOG.map((t) => ({ ...t, isLiked: false }));
      setTracks(catalogOnly);
      setShowOnlyLiked(false);
      setActiveTrack((prev) => catalogOnly.find((t) => t.id === prev.id) || catalogOnly[0]);
      return;
    }

    const saved = loadSavedLibrary();
    setTracks(saved);
    setActiveTrack((prev) => saved.find((t) => t.id === prev.id) || saved[0] || MUSIC_CATALOG[0]);
    setAuthNotice(null);

    if (firebaseUid) {
      getFirestorePrivateAccount(firebaseUid)
        .then((privateAcct) => {
          if (!privateAcct) return;
          const likedSet = new Set(privateAcct.likedTrackIds || []);
          const customList = Array.isArray(privateAcct.customTracks)
            ? privateAcct.customTracks
            : [];
          const mergedCatalog = MUSIC_CATALOG.map((t) => ({
            ...t,
            isLiked: likedSet.has(t.id),
          }));
          const customIds = new Set(customList.map((c) => c.id));
          const merged = [
            ...customList.map((c) => ({ ...c, isLiked: likedSet.has(c.id) || Boolean(c.isLiked) })),
            ...mergedCatalog.filter((t) => !customIds.has(t.id)),
          ];
          setTracks(merged);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          } catch {
            // ignore storage errors
          }
        })
        .catch(() => {
          // Handled via ErrorBoundary or fallback
        });
    }
  }, [isSignedIn, firebaseUid]);

  const persistTracks = (updated: TrackItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
    if (firebaseUid) {
      const likedIds = updated.filter((t) => t.isLiked).map((t) => t.id);
      const catalogIds = new Set(MUSIC_CATALOG.map((t) => t.id));
      const customTracks = updated.filter((t) => !catalogIds.has(t.id));
      void updateFirestoreMusicLibrary(firebaseUid, likedIds, customTracks);
    }
  };

  const requireAuth = (actionLabel: string) => {
    setAuthNotice(`You are signed out. Sign in to ${actionLabel}.`);
  };

  // Persist liked status & library only when signed in
  const toggleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSignedIn) {
      requireAuth('save tracks or playlists');
      return;
    }

    const updated = tracks.map((t) =>
      t.id === id ? { ...t, isLiked: !t.isLiked } : t
    );
    setTracks(updated);
    if (activeTrack.id === id) {
      setActiveTrack({ ...activeTrack, isLiked: !activeTrack.isLiked });
    }
    persistTracks(updated);
  };

  const handleToggleSavedPlaylist = () => {
    if (!isSignedIn) {
      requireAuth('access saved playlists');
      return;
    }
    setShowOnlyLiked((prev) => !prev);
  };

  const handleAddCustomTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignedIn) {
      requireAuth('save playlists or custom streams');
      return;
    }
    if (!customUrl.trim()) return;

    const encoded = encodeURIComponent(customUrl.trim());
    const embed = `https://w.soundcloud.com/player/?url=${encoded}&color=%23e11d48&auto_play=true&show_artwork=true`;

    const newTrack: TrackItem = {
      id: `custom-${Date.now()}`,
      title: customTitle.trim() || 'Custom SoundCloud Stream',
      artist: 'SoundCloud Artist',
      duration: 'Stream',
      genre: 'User Stream',
      embedUrl: embed,
      artwork: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=60',
      isLiked: true,
    };

    const updated = [newTrack, ...tracks];
    setTracks(updated);
    setActiveTrack(newTrack);
    setCustomUrl('');
    setCustomTitle('');
    persistTracks(updated);
  };

  const genres = ['all', 'Lo-Fi Chill', 'Synthwave', 'EDM / Gaming', 'Chillhop', 'Dark Ambient'];

  const filteredTracks = tracks.filter((track) => {
    const matchesSearch =
      track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.genre.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesGenre = selectedGenre === 'all' || track.genre === selectedGenre;
    const matchesLiked = !showOnlyLiked || (isSignedIn && track.isLiked);

    return matchesSearch && matchesGenre && matchesLiked;
  });

  const likedCount = isSignedIn ? tracks.filter((t) => t.isLiked).length : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Music2 className="w-7 h-7 text-blue-600" />
            <span>SoundCloud Music Lounge</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Stream SoundCloud mixes, curated study lo-fi, gaming beats, and save playlists when signed in.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tracks, artists, genres..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Signed-Out Notice Banner */}
      {!isSignedIn && authNotice && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>{authNotice}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onRequireSignIn}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => setAuthNotice(null)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Active Player Stage */}
      <div className="p-6 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-slate-200 dark:border-slate-700">
              <SafeImage
                src={activeTrack.artwork}
                alt={activeTrack.title}
                fallbackIcon={<Music2 className="w-5 h-5 text-blue-400" />}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {activeTrack.title}
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 uppercase">
                  {activeTrack.genre}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeTrack.artist} · {activeTrack.duration}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => toggleLike(activeTrack.id, e)}
              title={!isSignedIn ? 'Sign in to save tracks' : activeTrack.isLiked ? 'Remove from saved' : 'Save to playlist'}
              className={`p-2.5 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
                !isSignedIn
                  ? 'bg-slate-100 dark:bg-slate-800/70 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700'
                  : activeTrack.isLiked
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:text-slate-900'
              }`}
            >
              {!isSignedIn ? (
                <Lock className="w-3.5 h-3.5" />
              ) : (
                <Heart className={`w-4 h-4 ${activeTrack.isLiked ? 'fill-current' : ''}`} />
              )}
              <span>{!isSignedIn ? 'Sign In to Save' : activeTrack.isLiked ? 'Saved' : 'Save'}</span>
            </button>
          </div>
        </div>

        {/* Real Live SoundCloud Iframe Widget */}
        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950">
          <iframe
            key={activeTrack.id}
            width="100%"
            height="166"
            scrolling="no"
            frameBorder="no"
            allow="autoplay"
            src={activeTrack.embedUrl}
            title={activeTrack.title}
            className="w-full"
          />
        </div>
      </div>

      {/* Layerable Ambient Sound Mixer */}
      <AmbientSoundMixer />

      {/* Filter and Saved Playlist Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => {
              setSelectedGenre('all');
              setShowOnlyLiked(false);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors cursor-pointer ${
              selectedGenre === 'all' && !showOnlyLiked
                ? 'bg-rose-600 text-white'
                : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            All Tracks
          </button>

          <button
            type="button"
            onClick={handleToggleSavedPlaylist}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              !isSignedIn
                ? 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800'
                : showOnlyLiked
                ? 'bg-rose-600 text-white'
                : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {!isSignedIn ? (
              <Lock className="w-3.5 h-3.5" />
            ) : (
              <Heart className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Saved Playlist{isSignedIn ? ` (${likedCount})` : ''}</span>
          </button>

          {genres.filter((g) => g !== 'all').map((genre) => (
            <button
              type="button"
              key={genre}
              onClick={() => {
                setSelectedGenre(genre);
                setShowOnlyLiked(false);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors cursor-pointer ${
                selectedGenre === genre && !showOnlyLiked
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* Track List */}
      <div className="space-y-3">
        {filteredTracks.map((track) => {
          const isCurrent = activeTrack.id === track.id;
          return (
            <div
              key={track.id}
              onClick={() => setActiveTrack(track)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                isCurrent
                  ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 shadow-sm'
                  : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-950 shrink-0 relative flex items-center justify-center">
                  <SafeImage
                    src={track.artwork}
                    alt={track.title}
                    fallbackIcon={<Music2 className="w-4 h-4 text-blue-400" />}
                    className="w-full h-full object-cover"
                  />
                  {isCurrent && (
                    <div className="absolute inset-0 bg-blue-600/70 flex items-center justify-center">
                      <Play className="w-4 h-4 fill-white text-white" />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <h4 className={`text-sm font-bold truncate ${isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-white'}`}>
                    {track.title}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>{track.artist}</span>
                    <span aria-hidden="true">·</span>
                    <span>{track.genre}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-mono text-slate-400 hidden sm:inline">
                  {track.duration}
                </span>
                <button
                  type="button"
                  onClick={(e) => toggleLike(track.id, e)}
                  className={`p-2 rounded-lg transition-colors cursor-pointer ${
                    !isSignedIn
                      ? 'text-slate-400 hover:text-amber-500'
                      : track.isLiked
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                  title={!isSignedIn ? 'Sign in to save tracks' : track.isLiked ? 'Remove from saved' : 'Save to playlist'}
                >
                  {!isSignedIn ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <Heart className={`w-4 h-4 ${track.isLiked ? 'fill-current' : ''}`} />
                  )}
                </button>
              </div>
            </div>
          );
        })}

        {filteredTracks.length === 0 && (
          <div className="p-8 text-center rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-500">
            No tracks found matching your query. Try clearing the filter or add a custom SoundCloud URL below.
          </div>
        )}
      </div>

      {/* Add / Save Custom SoundCloud Track or Playlist Section */}
      <div className="p-6 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {isSignedIn ? (
              <Plus className="w-5 h-5 text-rose-600" />
            ) : (
              <Lock className="w-5 h-5 text-amber-500" />
            )}
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Save SoundCloud Track or Playlist
            </h3>
          </div>
          {!isSignedIn && (
            <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[11px] font-bold">
              Sign In Required
            </span>
          )}
        </div>

        {isSignedIn ? (
          <>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Paste any public SoundCloud song or playlist URL (e.g., https://soundcloud.com/artist/song-title) to play and save it to your K1ngkell playlist.
            </p>

            <form onSubmit={handleAddCustomTrack} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Track or Playlist Title (optional)"
                className="px-3.5 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
              <input
                type="url"
                required
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://soundcloud.com/..."
                className="px-3.5 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                Save & Play Stream
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              You are currently signed out. Sign in to your K1ngkell account to save playlists, favorite tracks, or add custom SoundCloud streams.
            </p>
            <button
              type="button"
              onClick={onRequireSignIn}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In to Save Playlists</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
