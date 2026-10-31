import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { Post } from '../types';

interface PostEditorModalProps {
  post: Post;
  onClose: () => void;
  onSave: (updates: { title: string; content: string }) => Promise<void> | void;
}

export const PostEditorModal: React.FC<PostEditorModalProps> = ({ post, onClose, onSave }) => {
  const [title, setTitle] = useState(post.title === 'Discussion' ? '' : post.title);
  const [content, setContent] = useState(post.content);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!content.trim()) {
      setError('Post text is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ title: title.trim(), content: content.trim() });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save your changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-post-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">Your post</p>
            <h2 id="edit-post-title" className="mt-1 text-xl font-black text-slate-900">Edit post</h2>
            <p className="mt-1 text-xs text-slate-500">Your images, attachments, poll, and tags will stay unchanged.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close edit post" className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>
        <label className="mt-5 block text-xs font-black text-slate-700" htmlFor="edit-post-title-input">Title</label>
        <input
          id="edit-post-title-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Post title"
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        />
        <label className="mt-4 block text-xs font-black text-slate-700" htmlFor="edit-post-content-input">Post text</label>
        <textarea
          id="edit-post-content-input"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={7}
          className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm leading-6 text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        />
        {error && <p className="mt-2 text-xs font-bold text-rose-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-600 hover:bg-slate-50 cursor-pointer">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
};