import React, { useEffect, useState } from 'react';
import { resolveAssetUrl } from '../api';

interface AvatarProps {
  avatar: string | undefined;
  className?: string;
  fallbackClassName?: string;
  fallbackText?: string;
}

export default function Avatar({ avatar, className = "w-full h-full rounded-full object-cover object-center", fallbackClassName = "", fallbackText }: AvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => {
    setImageFailed(false);
  }, [avatar]);

  const fallbackLabel = fallbackText
    ?.trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || '?';

  if (!avatar) {
    return (
      <div className={`w-full h-full rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-slate-500 ${fallbackClassName}`}>
        {fallbackLabel}
      </div>
    );
  }

  const isImage = avatar.startsWith('data:image/') || 
                  avatar.startsWith('http://') || 
                  avatar.startsWith('https://') || 
                  avatar.startsWith('/api/') ||
                  avatar.length > 4;
  const imageSrc = resolveAssetUrl(avatar);

  if (isImage && !imageFailed) {
    return (
      <img
        src={imageSrc}
        alt="User Visual"
        className={`block object-cover object-center ${className}`}
        referrerPolicy="no-referrer"
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div className={`w-full h-full rounded-full bg-indigo-500 dark:bg-zinc-800 flex items-center justify-center font-extrabold text-white ${fallbackClassName}`}>
      {fallbackLabel}
    </div>
  );
}
