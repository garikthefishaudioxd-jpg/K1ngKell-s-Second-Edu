export type ActiveTab =
  | 'home'
  | 'games'
  | 'music'
  | 'cinema'
  | 'chat'
  | 'ai'
  | 'security'
  | 'settings';

export type BackgroundTheme =
  | 'sunny-hill'
  | 'sunset-mountain'
  | 'beach'
  | 'city'
  | 'dark'
  | 'custom';

export type PrimaryColor = 'rose-red' | 'royal-blue' | 'emerald' | 'violet' | 'amber';

export type SearchEngine = 'google' | 'duckduckgo' | 'bing' | 'brave';

export type LogoStyle = 'packet-bottle' | 'cyber-badge' | 'neon-crest';

export interface GameItem {
  id: string;
  title: string;
  category: 'arcade' | 'math' | 'puzzle' | 'retro' | 'action';
  description: string;
  thumbnail: string;
  playType: 'canvas' | 'embed' | 'lumin';
  embedUrl?: string;
  plays: number;
  featured?: boolean;
}

export interface TrackItem {
  id: string;
  title: string;
  artist: string;
  duration: string;
  genre: string;
  embedUrl: string;
  artwork?: string;
  isLiked?: boolean;
}

export interface MovieItem {
  id: string;
  title: string;
  year: number;
  genre: string;
  duration: string;
  description: string;
  videoUrl: string;
  poster: string;
  rating: string;
  license: string;
}

export interface ChatMessage {
  id: string;
  author: string;
  avatar: string;
  content: string;
  timestamp: string;
  role?: 'user' | 'bot' | 'mod' | 'admin';
  reactions?: { [emoji: string]: number };
}

export interface UserSettings {
  theme: BackgroundTheme;
  customWallpaperUrl?: string;
  darkMode: boolean;
  primaryColor: PrimaryColor;
  customColorHex?: string;
  searchEngine: SearchEngine;
  timezone: string;
  logoStyle: LogoStyle;
  customGeminiApiKey?: string;
  offlineMode: boolean;
  username: string;
  userAvatar: string;
}

export interface EmbedSearchResult {
  title: string;
  snippet: string;
  url: string;
  source: string;
}

export interface EmbedTabItem {
  id: string;
  title: string;
  url: string;
  query?: string;
  isLoading?: boolean;
  results?: EmbedSearchResult[];
  summary?: string;
  error?: string;
  viewMode: 'embed' | 'results' | 'newtab';
  history: string[];
  historyIndex: number;
}

