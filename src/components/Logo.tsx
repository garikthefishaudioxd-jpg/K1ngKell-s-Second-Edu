import React from 'react';
import { LogoStyle } from '../types';

interface LogoProps {
  style?: LogoStyle;
  className?: string;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  style = 'packet-bottle',
  className = 'w-9 h-9',
  showText = true,
}) => {
  return (
    <div className="flex items-center gap-2.5 shrink-0 select-none">
      {style === 'packet-bottle' && (
        <div className={`relative ${className} flex items-center justify-center shrink-0`}>
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
            {/* Bottle / Packet Cap */}
            <rect x="25" y="4" width="14" height="7" rx="2" fill="#2563eb" />
            <rect x="27" y="11" width="10" height="4" fill="#1d4ed8" />
            
            {/* Packet Bottle Contour */}
            <path
              d="M17 19C17 16.7909 18.7909 15 21 15H43C45.2091 15 47 16.7909 47 19V54C47 57.3137 44.3137 60 41 60H23C19.6863 60 17 57.3137 17 54V19Z"
              fill="url(#packetGradient)"
            />
            {/* Packet seal lines */}
            <path d="M17 21L47 21" stroke="#f43f5e" strokeWidth="2" strokeDasharray="2 2" />
            <path d="M17 56L47 56" stroke="#2563eb" strokeWidth="2" strokeDasharray="2 2" />

            {/* Stylized "K" Crown Mark on Packet */}
            <path
              d="M24 28V46M24 37L36 28M27 35L38 46"
              stroke="#ffffff"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Tiny crown on top */}
            <path
              d="M27 24L32 21L37 24"
              stroke="#fbbf24"
              strokeWidth="2"
              strokeLinecap="round"
            />

            <defs>
              <linearGradient id="packetGradient" x1="17" y1="15" x2="47" y2="60" gradientUnits="userSpaceOnUse">
                <stop stopColor="#e11d48" />
                <stop offset="0.52" stopColor="#9333ea" />
                <stop offset="1" stopColor="#2563eb" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      )}

      {style === 'cyber-badge' && (
        <div className={`relative ${className} flex items-center justify-center shrink-0`}>
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow">
            <polygon points="32,4 60,18 60,46 32,60 4,46 4,18" fill="url(#cyberGrad)" />
            <polygon points="32,8 56,20 56,44 32,56 8,44 8,20" stroke="#38bdf8" strokeWidth="2" fill="none" />
            <text x="32" y="38" textAnchor="middle" fill="#ffffff" fontSize="18" fontWeight="bold" fontFamily="monospace">
              K1
            </text>
            <defs>
              <linearGradient id="cyberGrad" x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
                <stop stopColor="#e11d48" />
                <stop offset="1" stopColor="#1d4ed8" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      )}

      {style === 'neon-crest' && (
        <div className={`relative ${className} flex items-center justify-center shrink-0`}>
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="32" cy="32" r="28" fill="#0f172a" stroke="#e11d48" strokeWidth="3" />
            <circle cx="32" cy="32" r="22" stroke="#2563eb" strokeWidth="2" strokeDasharray="4 3" />
            <path d="M22 40V24L32 32L42 24V40" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      {showText && (
        <div className="flex flex-col">
          <span className="text-xl font-black tracking-tight leading-none text-slate-900 dark:text-white flex items-center gap-1">
            <span className="text-rose-600">K1</span>
            <span className="text-blue-600">ngkell</span>
          </span>
          <span className="text-[10px] tracking-wider uppercase font-semibold text-slate-500 dark:text-slate-400">
            Media & Games Portal
          </span>
        </div>
      )}
    </div>
  );
};
