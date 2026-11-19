import React, { useState, useRef } from 'react';
import { MovieItem } from '../types';
import { MOVIES_DATA } from '../data/movies';
import { Film, Play, Search, ShieldCheck, Sparkles, Plus, Maximize, Volume2, Info } from 'lucide-react';

export const CinemaTab: React.FC = () => {
  const [movies, setMovies] = useState<MovieItem[]>(MOVIES_DATA);
  const [activeMovie, setActiveMovie] = useState<MovieItem>(MOVIES_DATA[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [customStreamUrl, setCustomStreamUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleAddCustomMovie = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStreamUrl.trim()) return;

    const newMovie: MovieItem = {
      id: `custom-movie-${Date.now()}`,
      title: customTitle.trim() || 'Custom Video Stream',
      year: new Date().getFullYear(),
      genre: 'User Stream',
      duration: 'Online Stream',
      description: 'Custom verified direct video stream added by user.',
      videoUrl: customStreamUrl.trim(),
      poster: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80',
      rating: 'NR',
      license: 'User Provided Stream',
    };

    setMovies([newMovie, ...movies]);
    setActiveMovie(newMovie);
    setCustomStreamUrl('');
    setCustomTitle('');
  };

  const filteredMovies = movies.filter(
    (m) =>
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.genre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Film className="w-7 h-7 text-amber-500" />
            <span>K1ngkell Legal Cinema</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            100% legal, open-source & public domain cinema streams from the Blender Foundation and Open Archives.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search films, genres..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Main Theater Stage */}
      <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl space-y-4">
        {/* Video Player Container */}
        <div className="relative aspect-video w-full bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            key={activeMovie.id}
            src={activeMovie.videoUrl}
            controls
            autoPlay={false}
            poster={activeMovie.poster}
            className="w-full h-full object-contain"
          >
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Video Info Strip */}
        <div className="p-6 text-white space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">{activeMovie.title}</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {activeMovie.rating}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                <span>{activeMovie.year}</span>
                <span aria-hidden="true">·</span>
                <span>{activeMovie.genre}</span>
                <span aria-hidden="true">·</span>
                <span>{activeMovie.duration}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900 px-3 py-1.5 rounded-xl">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{activeMovie.license}</span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
            {activeMovie.description}
          </p>
        </div>
      </div>

      {/* Film Catalog Grid */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          Available Legal Features ({filteredMovies.length})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredMovies.map((movie) => {
            const isPlaying = activeMovie.id === movie.id;
            return (
              <div
                key={movie.id}
                onClick={() => {
                  setActiveMovie(movie);
                  window.scrollTo({ top: 120, behavior: 'smooth' });
                }}
                className={`group cursor-pointer rounded-2xl overflow-hidden border transition-all ${
                  isPlaying
                    ? 'ring-2 ring-amber-500 bg-amber-50/10 dark:bg-amber-950/20 border-amber-500'
                    : 'bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:shadow-xl hover:-translate-y-1'
                }`}
              >
                <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
                  <img
                    src={movie.poster}
                    alt={movie.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 text-[10px] font-bold rounded-md bg-black/60 text-white backdrop-blur-xs">
                    {movie.duration}
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-white">
                    <span className="text-xs font-bold truncate">{movie.title}</span>
                    <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center shrink-0 shadow-md">
                      <Play className="w-3.5 h-3.5 fill-slate-950 text-slate-950 ml-0.5" />
                    </div>
                  </div>
                </div>

                <div className="p-3.5 space-y-1">
                  <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                    {movie.genre}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {movie.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Custom Video Stream */}
      <div className="p-6 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Plus className="w-5 h-5 text-amber-500" />
          <h3 className="font-bold text-slate-900 dark:text-white text-base">
            Embed Direct Video Stream / WebM / MP4
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Enter any public direct media URL to stream it seamlessly in the K1ngkell cinema theater.
        </p>

        <form onSubmit={handleAddCustomMovie} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="Stream Title"
            className="px-3.5 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          />
          <input
            type="url"
            required
            value={customStreamUrl}
            onChange={(e) => setCustomStreamUrl(e.target.value)}
            placeholder="https://...mp4 or stream URL"
            className="px-3.5 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          />
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-500 rounded-xl transition-colors shadow-xs font-bold"
          >
            Play Stream
          </button>
        </form>
      </div>
    </div>
  );
};
