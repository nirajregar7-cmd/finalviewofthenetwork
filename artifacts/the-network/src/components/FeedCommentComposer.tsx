import React, {
  forwardRef,
  memo,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Send } from 'lucide-react';
import type { UserProfile } from '../types';
import { mentionHandle } from '../lib/mentions';

export interface FeedCommentComposerHandle {
  focus: () => void;
  mentionUser: (fullName: string) => void;
}

interface FeedCommentComposerProps {
  postId: string;
  currentUserId: string;
  allUsers: UserProfile[];
  darkMode: boolean;
  placeholder: string;
  formClassName: string;
  inputClassName: string;
  buttonClassName: string;
  buttonId?: string;
  buttonLabel?: string;
  onSubmit: (postId: string, content: string) => void | Promise<void>;
}

const FeedCommentComposer = memo(forwardRef<
  FeedCommentComposerHandle,
  FeedCommentComposerProps
>(function FeedCommentComposer({
  postId,
  currentUserId,
  allUsers,
  darkMode,
  placeholder,
  formClassName,
  inputClassName,
  buttonClassName,
  buttonId,
  buttonLabel,
  onSubmit,
}, ref) {
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const mentionUser = useCallback((fullName: string) => {
    const mention = `@${mentionHandle(fullName)} `;
    setValue((existingValue) => {
      const existing = existingValue.trimStart();
      const alreadyMentioned = existing.toLowerCase().startsWith(mention.toLowerCase());
      return alreadyMentioned ? existingValue : `${mention}${existing}`;
    });
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const focus = useCallback(() => inputRef.current?.focus(), []);
  useImperativeHandle(ref, () => ({ focus, mentionUser }), [focus, mentionUser]);

  const mentionMatch = value.match(/(^|\s)@([a-z0-9._-]*)$/i);
  const mentionQuery = mentionMatch ? mentionMatch[2].toLowerCase() : null;
  const suggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    return allUsers
      .filter((user) => !user.isSuspended && user.id !== currentUserId)
      .filter((user) => !mentionQuery || user.fullName.toLowerCase().includes(mentionQuery))
      .slice(0, 5);
  }, [allUsers, currentUserId, mentionQuery]);

  const selectMention = (user: UserProfile) => {
    if (!mentionMatch) return;
    const mentionStart = value.length - mentionMatch[0].length + mentionMatch[1].length;
    setValue(`${value.slice(0, mentionStart)}@${mentionHandle(user.fullName)} `);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = value.trim();
    if (!content || submitting) return;

    setError('');
    setSubmitting(true);
    setValue('');
    try {
      await onSubmit(postId, content);
    } catch {
      setValue((currentValue) => currentValue || content);
      setError('Could not send your comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={formClassName} aria-busy={submitting}>
      <div className="flex w-full gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            id={`input-comment-${postId}`}
            ref={inputRef}
            data-post-comment-input={postId}
            type="text"
            required
            autoComplete="off"
            aria-label="Write a comment"
            placeholder={placeholder}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setError('');
            }}
            className={inputClassName}
          />
          {suggestions.length > 0 && (
            <div className={`absolute bottom-[calc(100%+5px)] left-0 z-30 w-full max-w-[260px] overflow-hidden rounded-xl border shadow-xl ${darkMode ? 'border-white/10 bg-[#171722]' : 'border-indigo-100 bg-white'}`}>
              <p className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Mention a student
              </p>
              {suggestions.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    selectMention(user);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors ${darkMode ? 'hover:bg-white/8' : 'hover:bg-indigo-50'}`}
                >
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full text-[9px] font-bold ${darkMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-600'}`}>
                    {user.fullName.trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className={`block truncate text-[11px] font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                      {user.fullName}
                    </span>
                    <span className={`block truncate text-[9px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      {user.college}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          id={buttonId}
          type="submit"
          disabled={!value.trim() || submitting}
          aria-label="Post comment"
          className={`${buttonClassName} disabled:cursor-wait disabled:opacity-60`}
        >
          <Send size={11} />
          {buttonLabel && <span>{buttonLabel}</span>}
        </button>
      </div>
      {error && <p role="alert" className="text-[10px] font-medium text-rose-600">{error}</p>}
    </form>
  );
}));

export default FeedCommentComposer;
