import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Globe, Loader2 } from 'lucide-react';
import { API_ORIGIN } from '../../api';

const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;

function cleanUrl(value: string) {
  return value.replace(/[),.!?;:]+$/g, '');
}

export function extractUrls(text: string): string[] {
  return Array.from(new Set((text.match(URL_PATTERN) || []).map(cleanUrl))).slice(0, 3);
}

export const LinkifiedText: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(https?:\/\/[^\s<>"']+)/gi);
  return (
    <>
      {parts.map((part, index) => {
        const url = /^https?:\/\//i.test(part) ? cleanUrl(part) : null;
        if (!url) return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
        return (
          <a
            key={`${url}-${index}`}
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            className="break-all font-semibold text-indigo-600 underline decoration-indigo-200 underline-offset-2 hover:text-indigo-800"
            onClick={(event) => event.stopPropagation()}
          >
            {url}
          </a>
        );
      })}
    </>
  );
};

interface LinkPreviewProps {
  url: string;
}

interface PreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

export const LinkPreview: React.FC<LinkPreviewProps> = ({ url }) => {
  const normalizedUrl = useMemo(() => cleanUrl(url), [url]);
  const [preview, setPreview] = useState<PreviewData>({
    url: normalizedUrl,
    siteName: (() => {
      try {
        return new URL(normalizedUrl).hostname.replace(/^www\./, '');
      } catch {
        return normalizedUrl;
      }
    })(),
  });
  const [imageFailed, setImageFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setImageFailed(false);
    setIsLoading(true);
    fetch(`${API_ORIGIN}/api/link-preview?url=${encodeURIComponent(normalizedUrl)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Preview unavailable');
        return response.json() as Promise<PreviewData>;
      })
      .then((data) => setPreview((current) => ({ ...current, ...data, url: normalizedUrl })))
      .catch(() => {
        // The direct link card remains useful when a site blocks metadata fetching.
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [normalizedUrl]);

  return (
    <a
      href={normalizedUrl}
      target="_blank"
      rel="noreferrer noopener"
      className="group block overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition-colors hover:border-indigo-300 hover:bg-indigo-50/40"
    >
      {preview.image && !imageFailed ? (
        <img
          src={preview.image}
          alt=""
          onError={() => setImageFailed(true)}
          className="h-32 w-full object-cover"
        />
      ) : (
        <div className="flex h-10 items-center gap-2 border-b border-slate-200/80 px-3 text-[11px] font-semibold text-slate-500">
          <Globe className="h-3.5 w-3.5 text-indigo-500" />
          <span>{preview.siteName}</span>
          {isLoading && !preview.title && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-slate-400" />}
        </div>
      )}
      <div className="space-y-1 p-3">
        <div className="flex items-start justify-between gap-3">
          <p className="line-clamp-2 text-xs font-bold text-slate-900 group-hover:text-indigo-700">
            {preview.title || preview.siteName || normalizedUrl}
          </p>
          <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-indigo-600" />
        </div>
        {preview.description && (
          <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-500">{preview.description}</p>
        )}
        <p className="truncate text-[10px] font-medium text-slate-400">{preview.siteName || normalizedUrl}</p>
      </div>
    </a>
  );
};