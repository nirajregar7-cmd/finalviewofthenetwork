import React, { forwardRef, memo, useImperativeHandle, useRef, useState } from 'react';
import { Mic, Send } from 'lucide-react';

export interface ChatMessageDraftHandle {
  getValue: () => string;
  setValue: (value: string | ((current: string) => string)) => void;
}

interface ChatMessageDraftInputProps {
  conversationTitle: string;
  isSending: boolean;
  hasAttachment: boolean;
  onFocus: () => void;
}

export const ChatMessageDraftInput = memo(forwardRef<
  ChatMessageDraftHandle,
  ChatMessageDraftInputProps
>(function ChatMessageDraftInput({
  conversationTitle,
  isSending,
  hasAttachment,
  onFocus,
}, ref) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    getValue: () => value,
    setValue,
  }), [value]);

  const canSend = Boolean(value.trim() || hasAttachment);

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        name="chat-message"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={`Message ${conversationTitle}...`}
        enterKeyHint="send"
        autoComplete="off"
        data-form-type="other"
        data-lpignore="true"
        data-1p-ignore="true"
        data-bwignore="true"
        onFocus={onFocus}
        className="min-w-0 flex-1 bg-transparent px-2 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 sm:text-base"
      />
      <button
        type="submit"
        disabled={!canSend || isSending}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        aria-label={canSend ? 'Send message' : 'Record voice message'}
      >
        {canSend ? (
          <Send className={`w-4 h-4 ${isSending ? 'animate-pulse' : ''}`} />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </button>
    </>
  );
}));
