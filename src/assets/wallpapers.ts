import sunnyHillImg from './images/k1ngkell_sunny_hill_1794001316471.jpg';
import sunsetMountainImg from './images/k1ngkell_sunset_mountain_1794001318108.jpg';
import beachViewImg from './images/k1ngkell_beach_view_1794001318223.jpg';
import citySkylineImg from './images/k1ngkell_city_skyline_1794001318430.jpg';
import { BackgroundTheme } from '../types';

export const WALLPAPER_MAP: Record<Exclude<BackgroundTheme, 'dark' | 'custom'>, string> = {
  'sunny-hill': sunnyHillImg,
  'sunset-mountain': sunsetMountainImg,
  beach: beachViewImg,
  city: citySkylineImg,
};
