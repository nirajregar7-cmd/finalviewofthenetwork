import React, { useEffect, useRef, useState } from 'react';
import { API_ORIGIN } from '../../api';

const TRANSPARENT_IMAGE =
  'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

function isProtectedPostImage(source: string | undefined): source is string {
  if (!source || typeof window === 'undefined') return false;

  try {
    const imageUrl = new URL(source, window.location.origin);
    const apiOrigin = API_ORIGIN
      ? new URL(API_ORIGIN, window.location.origin).origin
      : window.location.origin;
    return imageUrl.origin === apiOrigin &&
      /^\/api\/posts\/[^/]+\/image$/.test(imageUrl.pathname);
  } catch {
    return false;
  }
}

type AuthenticatedImageProps = React.ImgHTMLAttributes<HTMLImageElement>;

export const AuthenticatedImage: React.FC<AuthenticatedImageProps> = ({
  src,
  alt = '',
  loading,
  style,
  ...imageProps
}) => {
  const imageElementRef = useRef<HTMLImageElement>(null);
  const [nearViewport, setNearViewport] = useState(loading !== 'lazy');
  const [loadedImage, setLoadedImage] = useState<{
    source: string;
    objectUrl: string;
  } | null>(null);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const source = typeof src === 'string' ? src : undefined;
  const protectedImage = isProtectedPostImage(source);
  const token = typeof window !== 'undefined'
    ? window.localStorage.getItem('network_auth_token')
    : null;

  useEffect(() => {
    if (!protectedImage || loading !== 'lazy') {
      setNearViewport(true);
      return;
    }

    const imageElement = imageElementRef.current;
    if (!imageElement || typeof IntersectionObserver === 'undefined') {
      setNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setNearViewport(true);
        observer.disconnect();
      }
    }, { rootMargin: '300px' });
    observer.observe(imageElement);
    return () => observer.disconnect();
  }, [loading, protectedImage, source]);

  useEffect(() => {
    if (!protectedImage || !source || !nearViewport) return;

    setLoadedImage(null);
    setFailedSource(null);
    if (!token) {
      setFailedSource(source);
      return;
    }

    const controller = new AbortController();
    let active = true;
    let objectUrl: string | null = null;

    void fetch(source, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Image request failed (${response.status})`);
        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) {
          throw new Error('The server did not return an image.');
        }
        return blob;
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (active && source) {
          setLoadedImage({ source, objectUrl });
        } else if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      })
      .catch(() => {
        if (active) setFailedSource(source);
      });

    return () => {
      active = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [nearViewport, protectedImage, source, token]);

  const resolvedSource = protectedImage
    ? loadedImage?.source === source
      ? loadedImage.objectUrl
      : undefined
    : source;
  const waitingForProtectedImage = protectedImage && !resolvedSource;
  const failed = Boolean(source && failedSource === source);

  return (
    <img
      {...imageProps}
      ref={imageElementRef}
      src={resolvedSource || (waitingForProtectedImage ? TRANSPARENT_IMAGE : undefined)}
      alt={waitingForProtectedImage ? '' : alt}
      loading={loading}
      aria-busy={waitingForProtectedImage && !failed ? true : undefined}
      aria-hidden={waitingForProtectedImage ? true : undefined}
      data-image-load-failed={failed ? 'true' : undefined}
      style={waitingForProtectedImage
        ? { ...style, minHeight: style?.minHeight ?? '8rem' }
        : style}
    />
  );
};
