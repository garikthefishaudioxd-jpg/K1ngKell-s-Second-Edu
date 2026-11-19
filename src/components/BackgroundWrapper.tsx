import React from 'react';
import { BackgroundTheme } from '../types';

// Static references to generated background images
const WALLPAPER_MAP: Record<Exclude<BackgroundTheme, 'dark' | 'custom'>, string> = {
  'sunny-hill': '/src/assets/images/k1ngkell_sunny_hill_1794001316471.jpg',
  'sunset-mountain': '/src/assets/images/k1ngkell_sunset_mountain_1794001318108.jpg',
  'beach': '/src/assets/images/k1ngkell_beach_view_1794001318223.jpg',
  'city': '/src/assets/images/k1ngkell_city_skyline_1794001318430.jpg',
};

interface BackgroundWrapperProps {
  theme: BackgroundTheme;
  customWallpaperUrl?: string;
  darkMode: boolean;
  children: React.ReactNode;
}

export const BackgroundWrapper: React.FC<BackgroundWrapperProps> = ({
  theme,
  customWallpaperUrl,
  darkMode,
  children,
}) => {
  const getBackgroundImage = (): string | null => {
    if (theme === 'dark') return null;
    if (theme === 'custom' && customWallpaperUrl) return customWallpaperUrl;
    if (theme in WALLPAPER_MAP) {
      return WALLPAPER_MAP[theme as keyof typeof WALLPAPER_MAP];
    }
    return WALLPAPER_MAP['sunny-hill'];
  };

  const bgImg = getBackgroundImage();

  return (
    <div className={`relative min-h-screen w-full transition-colors duration-300 font-sans ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Background Wallpaper Layer */}
      {bgImg ? (
        <div
          className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700 pointer-events-none"
          style={{ backgroundImage: `url("${bgImg}")` }}
        >
          {/* Measured Readability Scrim Overlay */}
          <div
            className={`absolute inset-0 transition-opacity duration-300 ${
              darkMode
                ? 'bg-slate-950/80 backdrop-blur-xs'
                : 'bg-white/45 backdrop-blur-[2px]'
            }`}
          />
        </div>
      ) : (
        /* Dark Mesh Grid */
        <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black" />
      )}

      {/* Foreground Content */}
      <div className="relative z-10 flex min-h-screen flex-col">{children}</div>
    </div>
  );
};
