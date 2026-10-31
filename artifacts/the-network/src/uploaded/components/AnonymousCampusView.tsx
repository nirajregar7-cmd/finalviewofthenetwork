import React, { useMemo, useState } from 'react';
import { EyeOff, Heart, MessageCircle, Search, Send, ShieldCheck, Users, X } from 'lucide-react';
import { Post, User } from '../types';

interface AnonymousCampusViewProps {
  currentUser: User;
  posts: Post[];
  onCreatePost: (data: { title: string; content: string; topic: string }) => Promise<void>;
  onToggleLike: (postId: string) => void;
  onAddComment: (postId: string, content: string, isAnonymous?: boolean) => void;
  onStartAnonymousChat: (postId: string) => void;
}

const TOPICS = ['College life', 'Student life', 'Finding people', 'College advice'];

export const AnonymousCampusView: React.FC<AnonymousCampusViewProps> = ({
  currentUser,
  posts,
  onCreatePost,
  onToggleLike,
  onAddComment,
  onStartAnonymousChat,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [topic, setTopic] = useState(TOPICS[0]);
  const [respectConfirmed, setRespectConfirmed] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  const anonymousPosts = useMemo(() => posts.filter((post) => {
    if (!post.isAnonymous) return false;
    const query = search.trim().toLowerCase();
    return !query || `${post.title} ${post.content} ${post.tags?.join(' ')}`.toLowerCase().includes(query);
  }), [posts, search]);

  const publish = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isPublishing || !title.trim() || !content.trim() || !respectConfirmed) return;
    setError('');
    setIsPublishing(true);
    try {
      await onCreatePost({ title: title.trim(), content: content.trim(), topic });
      setTitle('');
      setContent('');
      setRespectConfirmed(false);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'Could not publish. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  const submitComment = (postId: string) => {
    if (!commentText.trim()) return;
    onAddComment(postId, commentText.trim(), true);
    setCommentText('');
    setCommentPostId(null);
  };

  return (
    <div className="anonymous-campus-view w-full max-w-6xl mx-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 space-y-5">
          <div className="anonymous-campus-banner relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 p-5 text-white shadow-lg sm:p-7">
            <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <div className="mb-3 flex items-center gap-2 text-white/80">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15">
                  <EyeOff className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">A private corner of campus</span>
              </div>
              <h1 className="max-w-xl text-2xl font-black tracking-tight sm:text-3xl">Say what you really mean.</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80">
                Share college moments, student-life questions, or find someone who understands — without showing your identity.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {TOPICS.map((item) => (
                  <span key={item} className="rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-semibold text-white/90">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <form onSubmit={publish} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">New anonymous post</p>
                <h2 className="mt-1 text-lg font-black text-slate-900">What is on your mind?</h2>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <EyeOff className="h-4 w-4" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_190px]">
              <input
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Give your post a clear title"
                className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white"
              />
              <select
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-400 focus:bg-white"
              >
                {TOPICS.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
            <textarea
              required
              rows={5}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Share the situation, what you need, and how people can respond. Do not include phone numbers or private details."
              className="mt-3 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white"
            />

            <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5">
              <input
                type="checkbox"
                checked={respectConfirmed}
                onChange={(event) => setRespectConfirmed(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-emerald-600"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-xs font-black text-emerald-900">
                  <ShieldCheck className="h-4 w-4" /> Keep it respectful
                </span>
                <span className="mt-1 block text-[11px] leading-relaxed text-emerald-800">
                  No harassment, hate, personal attacks, accusations, doxxing, or sharing anyone’s private details.
                </span>
              </span>
            </label>

            {error && <p role="alert" className="mt-3 text-xs font-semibold text-rose-600">{error}</p>}
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-[10px] leading-relaxed text-slate-400">Your name, photo, college, branch, and profile stay hidden.</p>
              <button
                type="submit"
                disabled={isPublishing || !respectConfirmed}
                className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" /> {isPublishing ? 'Publishing…' : 'Post anonymously'}
              </button>
            </div>
          </form>

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Anonymous community</p>
              <h2 className="mt-1 text-xl font-black text-slate-900">What students are sharing</h2>
            </div>
            <label className="flex w-40 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-400 sm:w-52">
              <Search className="h-4 w-4 shrink-0" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search posts" className="min-w-0 w-full bg-transparent text-xs text-slate-700 outline-none" />
            </label>
          </div>

          {anonymousPosts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <Users className="mx-auto h-7 w-7 text-slate-300" />
              <p className="mt-3 text-sm font-bold text-slate-700">{search ? 'No posts match your search.' : 'Be the first to share anonymously.'}</p>
              <p className="mt-1 text-xs text-slate-400">Your identity will stay protected.</p>
            </div>
          ) : anonymousPosts.map((post) => (
            <article key={post.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500"><EyeOff className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-700">{post.author.name}</p>
                    <p className="text-[11px] text-slate-400">{post.timestamp}</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700">{post.tags?.find((tag) => tag.toLowerCase().startsWith('anonymous topic:'))?.replace(/^anonymous topic:\s*/i, '') || 'Campus life'}</span>
              </div>
              <h3 className="mt-4 text-base font-black leading-tight text-slate-900">{post.title}</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{post.content}</p>
              <div className="mt-4 flex items-center gap-1 border-t border-slate-100 pt-3">
                <button onClick={() => onToggleLike(post.id)} className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${post.liked ? 'bg-rose-50 text-rose-600' : 'text-slate-500 hover:bg-slate-50'}`}>
                  <Heart className="h-4 w-4" fill={post.liked ? 'currentColor' : 'none'} /> {post.likesCount || post.upvotes || 0}
                </button>
                <button onClick={() => setCommentPostId(commentPostId === post.id ? null : post.id)} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-50">
                  <MessageCircle className="h-4 w-4" /> {post.comments.length}
                </button>
                <button onClick={() => onStartAnonymousChat(post.id)} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-indigo-600 transition hover:bg-indigo-50">
                  <MessageCircle className="h-4 w-4" /> Chat anonymously
                </button>
              </div>
              {commentPostId === post.id && (
                <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                  {post.comments.length > 0 && (
                    <div className="space-y-2">
                      {post.comments.map((comment) => (
                        <div key={comment.id} className="flex gap-2 rounded-xl bg-slate-50 p-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] text-slate-500">?</div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[11px] font-black text-slate-700">{comment.isAnonymous ? comment.author.name : 'Community member'}</p>
                              <span className="text-[10px] text-slate-400">{comment.timestamp}</span>
                            </div>
                            <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{comment.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] text-slate-500">?</div>
                    <input value={commentText} onChange={(event) => setCommentText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submitComment(post.id); }} placeholder="Reply anonymously…" aria-label="Anonymous reply" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-indigo-400" />
                    <button onClick={() => submitComment(post.id)} className="rounded-xl bg-indigo-600 px-3 text-white" aria-label="Send anonymous reply"><Send className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </section>

        <aside className="h-fit space-y-4 lg:sticky lg:top-24">
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-center gap-2 text-amber-900"><ShieldCheck className="h-5 w-5" /><h2 className="text-sm font-black">A safe space works both ways</h2></div>
            <ul className="mt-4 space-y-3 text-xs leading-relaxed text-amber-900/80">
              <li>Keep people anonymous — do not guess or reveal who posted.</li>
              <li>Talk about your experience, not someone’s private identity.</li>
              <li>Use comments to support, not shame or pressure.</li>
              <li>Report anything threatening, hateful, or unsafe.</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-900"><EyeOff className="h-4 w-4 text-indigo-600" /><h2 className="text-sm font-black">Privacy promise</h2></div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">The platform keeps the real author internally for moderation and post ownership, but other students only see a stable anonymous ID.</p>
          </div>
        </aside>
      </div>
    </div>
  );
};