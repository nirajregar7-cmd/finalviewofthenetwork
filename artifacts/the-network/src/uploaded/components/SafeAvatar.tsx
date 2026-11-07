import React, { useEffect, useState } from 'react';
import { resolveAssetUrl } from '../../api';

interface SafeAvatarProps {
  src?: string;
  name: string;
  className: string;
  onClick?: () => void;
}

export const SafeAvatar: React.FC<SafeAvatarProps> = ({ src, name, className, onClick }) => {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'N';

  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return (
      <span onClick={onClick} className={`${className} bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-[10px]`}>
        {initials}
      </span>
    );
  }

  return (
    <img
      src={resolveAssetUrl(src)}
      alt={name}
      loading="lazy"
      decoding="async"
      onClick={onClick}
      onError={() => setFailed(true)}
      className={`block object-cover object-center ${className}`}
    />
  );
};