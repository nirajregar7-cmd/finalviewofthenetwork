import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { resolveAssetUrl } from '../../api';
import type { SharedPostPreview as SharedPostPreviewData } from '../types';
import { SafeAvatar } from './SafeAvatar';
import { AuthenticatedImage } from './AuthenticatedImage';

interface SharedPostPreviewProps {
  post: SharedPostPreviewData;
}

function getPostUrl(post: SharedPostPreviewData): string {
  const params = new URLSearchParams({ postId: post.id });
  const slug = post.communitySlug?.replace(/^\/+/, '').trim();
  if (slug && slug !== 'general') params.set('community', slug);
  return `/?${params.toString()}`;
}

export const SharedPostPreview: React.FC<SharedPostPreviewProps> = ({ post }) => {
  const imageUrl = resolveAssetUrl(post.imageUrl);

  return (
    <article className="my-1 w-full min-w-[220px] max-w-[22rem] overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <SafeAvatar
          src={post.authorAvatar || undefined}
          name={post.authorName}
          className="h-8 w-8 shrink-0 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-extrabold text-slate-900">{post.authorName}</p>
          <p className="truncate text-[10px] font-medium text-slate-500">
            {post.communitySlug
              ? `r/${post.communitySlug.replace(/^\/+/, '')}`
              : post.communityName || 'The Network'}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-1 text-[9px] font-bold text-indigo-700">
          Shared post
        </span>
      </div>

      {imageUrl && (
        <AuthenticatedImage
          src={imageUrl}
          alt=""
          loading="lazy"
          className="max-h-48 w-full bg-slate-100 object-cover"
        />
      )}

      <div className="px-3 pb-3">
        <h3 className="line-clamp-2 text-[13px] font-black leading-snug text-slate-900">{post.title}</h3>
        {post.content && (
          <p className="mt-1 line-clamp-3 whitespace-pre-line break-words text-[11px] leading-4 text-slate-600">
            {post.content}
          </p>
        )}
        <a
          href={getPostUrl(post)}
          className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-indigo-600 hover:text-indigo-800"
        >
          View post <ArrowUpRight className="h-3 w-3" />
        </a>
      </div>
    </article>
  );
};