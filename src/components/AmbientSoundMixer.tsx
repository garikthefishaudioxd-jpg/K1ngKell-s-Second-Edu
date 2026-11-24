import React, { useState, useEffect, useRef } from 'react';
import { CloudRain, Coffee, Trees, Flame, Waves, Wind, Volume2, VolumeX, Play, Pause, RotateCcw, Sliders } from 'lucide-react';

interface AmbientTrack {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  active: boolean;
  volume: number; // 0 to 1
}

const INITIAL_TRACKS: AmbientTrack[] = [
  {
    id: 'rain',
    name: 'Gentle Rain',
    description: 'Steady soothing rainfall with distant soft rumble',
    icon: CloudRain,
    color: 'text-sky-500',
    active: false,
    volume: 0.6,
  },
  {
    id: 'cafe',
    name: 'Cozy Café',
    description: 'Warm coffeehouse murmur, distant chatter & gentle clinks',
    icon: Coffee,
    color: 'text-amber-600',
    active: false,
    volume: 0.5,
  },
  {
    id: 'forest',
    name: 'Pine Forest',
    description: 'Rustling woodland breeze with tranquil songbirds',
    icon: Trees,
    color: 'text-emerald-500',
    active: false,
    volume: 0.5,
  },
  {
    id: 'campfire',
    name: 'Campfire',
    description: 'Warm crackling fireplace embers and glowing wood',
    icon: Flame,
    color: 'text-rose-500',
    active: false,
    volume: 0.5,
  },
  {
    id: 'ocean',
    name: 'Ocean Surf',
    description: 'Rhythmic rolling sea waves gently washing the shore',
    icon: Waves,
    color: 'text-blue-500',
    active: false,
    volume: 0.5,
  },
  {
    id: 'whitenoise',
    name: 'Study Fan',
    description: 'Consistent smooth noise floor for deep cognitive flow',
    icon: Wind,
    color: 'text-indigo-400',
    active: false,
    volume: 0.4,
  },
];

export const AmbientSoundMixer: React.FC = () => {
  const [tracks, setTracks] = useState<AmbientTrack[]>(() => {
    try {
      const saved = localStorage.getItem('k1ngkell_ambient_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        // keep icons mapped
        return INITIAL_TRACKS.map((init) => {
          const match = parsed.find((p: any) => p.id === init.id);
          return match ? { ...init, active: match.active, volume: match.volume } : init;
        });
      }
    } catch {}
    return INITIAL_TRACKS;
  });

  const [masterVolume, setMasterVolume] = useState<number>(0.8);
  const [isMasterMuted, setIsMasterMuted] = useState<boolean>(false);

  // Audio Context and Node References
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const soundNodesRef = useRef<{
    [key: string]: {
      gainNode: GainNode;
      stop: () => void;
    };
  }>({});

  // Initialize Audio Context on demand
  const ensureAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const masterGain = ctx.createGain();
      masterGain.gain.value = isMasterMuted ? 0 : masterVolume;
      masterGain.connect(ctx.destination);

      audioCtxRef.current = ctx;
      masterGainRef.current = masterGain;
    }

    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // Helper generators for procedural audio synthesis
  const createRainSound = (ctx: AudioContext, destination: AudioNode) => {
    // Pink noise buffer
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
      b6 = white * 0.115926;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Filter to simulate raindrops
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(destination);
    whiteNoise.start();

    return () => {
      try {
        whiteNoise.stop();
        whiteNoise.disconnect();
      } catch {}
    };
  };

  const createForestSound = (ctx: AudioContext, destination: AudioNode) => {
    // Wind noise
    const bufferSize = ctx.sampleRate * 3;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.06;
    }

    const windSource = ctx.createBufferSource();
    windSource.buffer = noiseBuffer;
    windSource.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.setValueAtTime(450, ctx.currentTime);
    windFilter.Q.setValueAtTime(3, ctx.currentTime);

    // LFO to modulate wind sway
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.2, ctx.currentTime);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(200, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(windFilter.frequency);

    windSource.connect(windFilter);
    windFilter.connect(destination);

    windSource.start();
    lfo.start();

    // Occasional gentle bird chirp
    let chirpTimer: ReturnType<typeof setTimeout>;
    const triggerBird = () => {
      if (ctx.state === 'closed') return;
      const osc = ctx.createOscillator();
      const chirpGain = ctx.createGain();
      chirpGain.gain.setValueAtTime(0.001, ctx.currentTime);
      chirpGain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.04);
      chirpGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.frequency.setValueAtTime(2600 + Math.random() * 600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(3400 + Math.random() * 800, ctx.currentTime + 0.12);
      osc.frequency.exponentialRampToValueAtTime(2200, ctx.currentTime + 0.25);

      osc.connect(chirpGain);
      chirpGain.connect(destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.26);

      chirpTimer = setTimeout(triggerBird, 3000 + Math.random() * 6000);
    };

    chirpTimer = setTimeout(triggerBird, 2000);

    return () => {
      clearTimeout(chirpTimer);
      try {
        windSource.stop();
        lfo.stop();
        windSource.disconnect();
      } catch {}
    };
  };

  const createCafeSound = (ctx: AudioContext, destination: AudioNode) => {
    // Low rumble chatter simulation
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.08;
    }

    const chatter = ctx.createBufferSource();
    chatter.buffer = noiseBuffer;
    chatter.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, ctx.currentTime);

    chatter.connect(filter);
    filter.connect(destination);
    chatter.start();

    // Subtle porcelain cup chime
    let clinkTimer: ReturnType<typeof setTimeout>;
    const triggerClink = () => {
      if (ctx.state === 'closed') return;
      const osc = ctx.createOscillator();
      const clinkGain = ctx.createGain();
      clinkGain.gain.setValueAtTime(0.02, ctx.currentTime);
      clinkGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400 + Math.random() * 400, ctx.currentTime);

      osc.connect(clinkGain);
      clinkGain.connect(destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.65);

      clinkTimer = setTimeout(triggerClink, 4000 + Math.random() * 8000);
    };
    clinkTimer = setTimeout(triggerClink, 3000);

    return () => {
      clearTimeout(clinkTimer);
      try {
        chatter.stop();
        chatter.disconnect();
      } catch {}
    };
  };

  const createCampfireSound = (ctx: AudioContext, destination: AudioNode) => {
    // Embers crackle
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.05;
    }

    const fire = ctx.createBufferSource();
    fire.buffer = noiseBuffer;
    fire.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);

    fire.connect(filter);
    filter.connect(destination);
    fire.start();

    // Random sharp crackle bursts
    let popTimer: ReturnType<typeof setTimeout>;
    const triggerPop = () => {
      if (ctx.state === 'closed') return;
      const osc = ctx.createOscillator();
      const popGain = ctx.createGain();
      popGain.gain.setValueAtTime(0.05 + Math.random() * 0.08, ctx.currentTime);
      popGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300 + Math.random() * 600, ctx.currentTime);

      osc.connect(popGain);
      popGain.connect(destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);

      popTimer = setTimeout(triggerPop, 200 + Math.random() * 1200);
    };
    popTimer = setTimeout(triggerPop, 500);

    return () => {
      clearTimeout(popTimer);
      try {
        fire.stop();
        fire.disconnect();
      } catch {}
    };
  };

  const createOceanSound = (ctx: AudioContext, destination: AudioNode) => {
    const bufferSize = ctx.sampleRate * 3;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.12;
    }

    const waveSource = ctx.createBufferSource();
    waveSource.buffer = noiseBuffer;
    waveSource.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, ctx.currentTime);

    // Modulation gain for swell & ebb
    const swellGain = ctx.createGain();
    swellGain.gain.setValueAtTime(0.5, ctx.currentTime);
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.12, ctx.currentTime); // ~8 sec wave period

    const lfoScale = ctx.createGain();
    lfoScale.gain.setValueAtTime(0.45, ctx.currentTime);

    lfo.connect(lfoScale);
    lfoScale.connect(swellGain.gain);

    waveSource.connect(filter);
    filter.connect(swellGain);
    swellGain.connect(destination);

    waveSource.start();
    lfo.start();

    return () => {
      try {
        waveSource.stop();
        lfo.stop();
        waveSource.disconnect();
      } catch {}
    };
  };

  const createWhiteNoise = (ctx: AudioContext, destination: AudioNode) => {
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.05;
    }

    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, ctx.currentTime);

    source.connect(filter);
    filter.connect(destination);
    source.start();

    return () => {
      try {
        source.stop();
        source.disconnect();
      } catch {}
    };
  };

  // Sync audio state with tracks array
  useEffect(() => {
    const anyActive = tracks.some((t) => t.active);
    if (!anyActive) {
      // Stop all active sound nodes
      Object.keys(soundNodesRef.current).forEach((id) => {
        soundNodesRef.current[id].stop();
        delete soundNodesRef.current[id];
      });
      return;
    }

    const ctx = ensureAudioContext();
    const masterGain = masterGainRef.current;
    if (!ctx || !masterGain) return;

    tracks.forEach((track) => {
      if (track.active) {
        if (!soundNodesRef.current[track.id]) {
          const trackGain = ctx.createGain();
          trackGain.gain.setValueAtTime(track.volume, ctx.currentTime);
          trackGain.connect(masterGain);

          let stopFn = () => {};
          if (track.id === 'rain') stopFn = createRainSound(ctx, trackGain);
          else if (track.id === 'forest') stopFn = createForestSound(ctx, trackGain);
          else if (track.id === 'cafe') stopFn = createCafeSound(ctx, trackGain);
          else if (track.id === 'campfire') stopFn = createCampfireSound(ctx, trackGain);
          else if (track.id === 'ocean') stopFn = createOceanSound(ctx, trackGain);
          else if (track.id === 'whitenoise') stopFn = createWhiteNoise(ctx, trackGain);

          soundNodesRef.current[track.id] = {
            gainNode: trackGain,
            stop: () => {
              stopFn();
              try {
                trackGain.disconnect();
              } catch {}
            },
          };
        } else {
          // Update volume smoothly
          const node = soundNodesRef.current[track.id];
          node.gainNode.gain.setTargetAtTime(track.volume, ctx.currentTime, 0.05);
        }
      } else {
        if (soundNodesRef.current[track.id]) {
          soundNodesRef.current[track.id].stop();
          delete soundNodesRef.current[track.id];
        }
      }
    });

    // Save preferences
    localStorage.setItem(
      'k1ngkell_ambient_settings',
      JSON.stringify(tracks.map((t) => ({ id: t.id, active: t.active, volume: t.volume })))
    );
  }, [tracks]);

  // Master volume effect
  useEffect(() => {
    if (masterGainRef.current && audioCtxRef.current) {
      const vol = isMasterMuted ? 0 : masterVolume;
      masterGainRef.current.gain.setTargetAtTime(vol, audioCtxRef.current.currentTime, 0.05);
    }
  }, [masterVolume, isMasterMuted]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      Object.keys(soundNodesRef.current).forEach((id) => {
        soundNodesRef.current[id].stop();
      });
      soundNodesRef.current = {};
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
      audioCtxRef.current = null;
      masterGainRef.current = null;
    };
  }, []);

  const toggleTrack = (id: string) => {
    ensureAudioContext();
    setTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, active: !t.active } : t))
    );
  };

  const changeVolume = (id: string, vol: number) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, volume: vol } : t))
    );
  };

  const applyPreset = (preset: 'focus' | 'nature' | 'relax' | 'reset') => {
    ensureAudioContext();
    if (preset === 'reset') {
      setTracks((prev) => prev.map((t) => ({ ...t, active: false })));
      return;
    }

    setTracks((prev) =>
      prev.map((t) => {
        if (preset === 'focus') {
          return {
            ...t,
            active: t.id === 'rain' || t.id === 'cafe',
            volume: t.id === 'rain' ? 0.6 : t.id === 'cafe' ? 0.4 : t.volume,
          };
        }
        if (preset === 'nature') {
          return {
            ...t,
            active: t.id === 'forest' || t.id === 'campfire',
            volume: t.id === 'forest' ? 0.5 : t.id === 'campfire' ? 0.4 : t.volume,
          };
        }
        if (preset === 'relax') {
          return {
            ...t,
            active: t.id === 'ocean' || t.id === 'rain',
            volume: t.id === 'ocean' ? 0.6 : t.id === 'rain' ? 0.3 : t.volume,
          };
        }
        return t;
      })
    );
  };

  const activeCount = tracks.filter((t) => t.active).length;

  return (
    <div className="p-6 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
      {/* Header and Master Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-indigo-500" />
            <h2 className="font-bold text-base text-slate-900 dark:text-white">
              Ambient Sound Layer Mixer
            </h2>
            {activeCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                {activeCount} active
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Layer procedural background sounds while listening to music, playing games, or studying.
          </p>
        </div>

        {/* Master Volume and Presets */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setIsMasterMuted(!isMasterMuted)}
              title={isMasterMuted ? 'Unmute Ambient Audio' : 'Mute Ambient Audio'}
              className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              {isMasterMuted ? (
                <VolumeX className="w-4 h-4 text-rose-500" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={masterVolume}
              onChange={(e) => {
                setMasterVolume(parseFloat(e.target.value));
                if (isMasterMuted) setIsMasterMuted(false);
              }}
              className="w-20 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          <button
            onClick={() => applyPreset('reset')}
            disabled={activeCount === 0}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Stop all ambient sounds"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Presets Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] font-semibold text-slate-400 shrink-0">
          Quick Vibes:
        </span>
        <button
          onClick={() => applyPreset('focus')}
          className="px-3 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 whitespace-nowrap transition-colors"
        >
          🌧️ Rain & Café
        </button>
        <button
          onClick={() => applyPreset('nature')}
          className="px-3 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 whitespace-nowrap transition-colors"
        >
          🌲 Forest & Campfire
        </button>
        <button
          onClick={() => applyPreset('relax')}
          className="px-3 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 whitespace-nowrap transition-colors"
        >
          🌊 Ocean & Soft Rain
        </button>
      </div>

      {/* Grid of Sound Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tracks.map((track) => {
          const Icon = track.icon;
          return (
            <div
              key={track.id}
              className={`p-4 rounded-xl border transition-all ${
                track.active
                  ? 'bg-slate-50 dark:bg-slate-800/80 border-indigo-500/50 dark:border-indigo-500/50 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                      track.active
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-slate-900 dark:text-white">
                      {track.name}
                    </h3>
                    <p className="text-[10px] text-slate-400 line-clamp-1">
                      {track.description}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => toggleTrack(track.id)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${
                    track.active
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {track.active ? (
                    <>
                      <Pause className="w-3 h-3 fill-current" />
                      <span>On</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current" />
                      <span>Off</span>
                    </>
                  )}
                </button>
              </div>

              {/* Volume Slider for Track */}
              <div className="flex items-center gap-2 pt-1">
                <Volume2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={track.volume}
                  disabled={!track.active}
                  onChange={(e) => changeVolume(track.id, parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-40"
                />
                <span className="text-[10px] font-mono text-slate-400 w-7 text-right">
                  {Math.round(track.volume * 100)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
