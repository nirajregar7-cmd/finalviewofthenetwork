import { useEffect, useState } from 'react';
import { resolveAssetUrl } from '../api';

interface PublicAvatarProps {
  avatar?: string | null;
  name: string;
  className?: string;
}

function getInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return initials || '?';
}

function isImageReference(value: string): boolean {
  return (
    /^data:image\//i.test(value) ||
    /^https?:\/\//i.test(value) ||
    value.startsWith('/api/')
  );
}

export default function PublicAvatar({ avatar, name, className = '' }: PublicAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const value = typeof avatar === 'string' ? avatar.trim() : '';
  const canLoadImage = Boolean(value) && isImageReference(value);

  useEffect(() => {
    setImageFailed(false);
  }, [avatar]);

  return (
    <div className={`flex items-center justify-center overflow-hidden ${className}`}>
      {canLoadImage && !imageFailed ? (
        <img
          src={resolveAssetUrl(value)}
          alt={name}
          className="block h-full w-full object-cover object-center"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="w-full h-full flex items-center justify-center font-semibold text-white">
          {getInitials(name)}
        </span>
      )}
    </div>
  );
}