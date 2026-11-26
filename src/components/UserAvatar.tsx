import React from 'react';
import {
  Sparkles,
  Flame,
  Gamepad2,
  Headphones,
  Crown,
  Zap,
  Rocket,
  Ghost,
  Compass,
  Shield,
  Music,
  Star,
} from 'lucide-react';

export interface AvatarPreset {
  id: string;
  label: string;
  gradient: string;
  iconName:
    | 'initials'
    | 'gamepad'
    | 'headphones'
    | 'flame'
    | 'crown'
    | 'zap'
    | 'rocket'
    | 'ghost'
    | 'sparkles'
    | 'compass'
    | 'shield'
    | 'music'
    | 'star';
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'initials',
    label: 'Initials',
    gradient: 'from-slate-600 to-slate-800',
    iconName: 'initials',
  },
  {
    id: 'preset:arcade',
    label: 'Arcade',
    gradient: 'from-rose-500 to-orange-500',
    iconName: 'gamepad',
  },
  {
    id: 'preset:dj',
    label: 'Synth DJ',
    gradient: 'from-blue-500 to-indigo-600',
    iconName: 'headphones',
  },
  {
    id: 'preset:blaze',
    label: 'Blaze',
    gradient: 'from-amber-500 to-rose-600',
    iconName: 'flame',
  },
  {
    id: 'preset:crown',
    label: 'Royal',
    gradient: 'from-yellow-400 to-amber-600',
    iconName: 'crown',
  },
  {
    id: 'preset:volt',
    label: 'Volt',
    gradient: 'from-cyan-400 to-blue-600',
    iconName: 'zap',
  },
  {
    id: 'preset:orbit',
    label: 'Orbit',
    gradient: 'from-violet-500 to-fuchsia-600',
    iconName: 'rocket',
  },
  {
    id: 'preset:phantom',
    label: 'Phantom',
    gradient: 'from-emerald-400 to-teal-600',
    iconName: 'ghost',
  },
  {
    id: 'preset:nova',
    label: 'Nova',
    gradient: 'from-pink-500 to-purple-600',
    iconName: 'sparkles',
  },
  {
    id: 'preset:voyager',
    label: 'Voyager',
    gradient: 'from-sky-500 to-emerald-500',
    iconName: 'compass',
  },
  {
    id: 'preset:guardian',
    label: 'Guardian',
    gradient: 'from-indigo-500 to-slate-800',
    iconName: 'shield',
  },
  {
    id: 'preset:starlight',
    label: 'Starlight',
    gradient: 'from-fuchsia-500 to-rose-600',
    iconName: 'star',
  },
];

function getInitials(name: string): string {
  const clean = name.trim();
  if (!clean) return '?';
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

function getAvatarTone(name: string): string {
  const tones = [
    'from-rose-500 to-rose-700',
    'from-blue-500 to-blue-700',
    'from-emerald-500 to-emerald-700',
    'from-indigo-500 to-indigo-700',
    'from-amber-500 to-amber-700',
    'from-cyan-500 to-cyan-700',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return tones[Math.abs(hash) % tones.length];
}

export function resizeAvatarImage(file: File, maxSize = 128): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image format'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = maxSize;
        canvas.height = maxSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result || ''));
          return;
        }
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, maxSize, maxSize);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

interface UserAvatarProps {
  avatar?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<UserAvatarProps['size']>, { box: string; icon: string; text: string }> = {
  xs: { box: 'w-5 h-5', icon: 'w-3 h-3', text: 'text-[9px]' },
  sm: { box: 'w-7 h-7', icon: 'w-3.5 h-3.5', text: 'text-[10px]' },
  md: { box: 'w-8 h-8', icon: 'w-4 h-4', text: 'text-xs' },
  lg: { box: 'w-9 h-9', icon: 'w-4.5 h-4.5', text: 'text-xs' },
  xl: { box: 'w-14 h-14', icon: 'w-7 h-7', text: 'text-lg' },
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatar,
  name,
  size = 'md',
  className = '',
}) => {
  const dims = SIZE_CLASSES[size];

  if (avatar && (avatar.startsWith('data:image/') || /^https?:\/\//i.test(avatar))) {
    return (
      <img
        src={avatar}
        alt={name}
        className={`${dims.box} rounded-full object-cover shrink-0 bg-slate-800 ${className}`}
      />
    );
  }

  const preset = AVATAR_PRESETS.find((p) => p.id === avatar);
  const gradient =
    preset && preset.id !== 'initials' ? preset.gradient : getAvatarTone(name);

  const renderIcon = () => {
    if (!preset || preset.iconName === 'initials') {
      return <span className={`font-bold text-white ${dims.text}`}>{getInitials(name)}</span>;
    }
    const iconProps = { className: `${dims.icon} text-white drop-shadow-xs` };
    switch (preset.iconName) {
      case 'gamepad':
        return <Gamepad2 {...iconProps} />;
      case 'headphones':
        return <Headphones {...iconProps} />;
      case 'flame':
        return <Flame {...iconProps} />;
      case 'crown':
        return <Crown {...iconProps} />;
      case 'zap':
        return <Zap {...iconProps} />;
      case 'rocket':
        return <Rocket {...iconProps} />;
      case 'ghost':
        return <Ghost {...iconProps} />;
      case 'sparkles':
        return <Sparkles {...iconProps} />;
      case 'compass':
        return <Compass {...iconProps} />;
      case 'shield':
        return <Shield {...iconProps} />;
      case 'music':
        return <Music {...iconProps} />;
      case 'star':
        return <Star {...iconProps} />;
      default:
        return <span className={`font-bold text-white ${dims.text}`}>{getInitials(name)}</span>;
    }
  };

  return (
    <div
      className={`${dims.box} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 select-none ${className}`}
    >
      {renderIcon()}
    </div>
  );
};
