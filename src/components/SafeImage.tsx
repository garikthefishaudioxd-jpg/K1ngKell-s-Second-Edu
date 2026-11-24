import React, { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface SafeImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackText?: string;
  fallbackIcon?: React.ReactNode;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = '',
  fallbackText,
  fallbackIcon,
}) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950 text-slate-300 select-none ${className}`}
        aria-label={alt}
      >
        {fallbackIcon || <ImageIcon className="w-6 h-6 opacity-60" />}
        {fallbackText && (
          <span className="mt-1 text-[10px] font-semibold opacity-75 px-2 text-center truncate max-w-full">
            {fallbackText}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
};
