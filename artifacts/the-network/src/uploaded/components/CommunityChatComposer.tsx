import React, { memo, useRef, useState } from 'react';
import { Paperclip, Send } from 'lucide-react';

interface CommunityChatComposerProps {
  inputId: string;
  placeholder: string;
  isSending: boolean;
  hasAttachment: boolean;
  draftRef: React.MutableRefObject<string>;
  onChooseAttachment: () => void;
  onSubmit: (text: string) => Promise<boolean>;
  onKeyboardFocus?: () => void;
  onKeyboardBlur?: () => void;
}

export const CommunityChatComposer = memo(function CommunityChatComposer({
  inputId,
  placeholder,
  isSending,
  hasAttachment,
  draftRef,
  onChooseAttachment,
  onSubmit,
  onKeyboardFocus,
  onKeyboardBlur,
}: CommunityChatComposerProps) {
  const [draft, setDraft] = useState(draftRef.current);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const updateDraft = (value: string) => {
    draftRef.current = value;
    setDraft(value);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if ((!text && !hasAttachment) || isSending) return;
    const submittedDraft = draft;
    updateDraft('');
    if (!await onSubmit(text)) {
      updateDraft(draftRef.current || submittedDraft);
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="flex items-end gap-2">
      <button
        type="button"
        onClick={onChooseAttachment}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100 hover:text-indigo-600"
        aria-label="Attach image or file"
      >
        <Paperclip className="h-4 w-4" />
      </button>
      <textarea
        ref={inputRef}
        id={inputId}
        value={draft}
        onFocus={onKeyboardFocus}
        onBlur={() => {
          window.setTimeout(() => {
            if (document.activeElement !== inputRef.current) onKeyboardBlur?.();
          }, 150);
        }}
        onChange={(event) => updateDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        placeholder={placeholder}
        rows={1}
        disabled={isSending}
        className="min-h-[42px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white"
      />
      <button
        type="submit"
        disabled={(!draft.trim() && !hasAttachment) || isSending}
        className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-3 text-xs font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Send className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{isSending ? 'Sending' : 'Send'}</span>
      </button>
    </form>
  );
});
