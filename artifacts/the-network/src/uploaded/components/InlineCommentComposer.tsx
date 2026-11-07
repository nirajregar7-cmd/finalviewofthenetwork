import React, {
  forwardRef,
  memo,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Send } from 'lucide-react';

export interface InlineCommentComposerHandle {
  getValue: () => string;
  setValue: (value: string) => void;
  focus: () => void;
}

interface InlineCommentComposerProps {
  postId: string;
  placeholder: string;
  onSubmit: (text: string) => Promise<boolean>;
  initialValue?: string;
  onDraftChange?: (value: string) => void;
  inputClassName?: string;
  buttonClassName?: string;
}

export const InlineCommentComposer = memo(forwardRef<
  InlineCommentComposerHandle,
  InlineCommentComposerProps
>(function InlineCommentComposer({
  postId,
  placeholder,
  onSubmit,
  initialValue = '',
  onDraftChange,
  inputClassName = 'min-w-[150px] flex-1 basis-[150px] rounded-full border border-transparent bg-slate-100 px-3 py-1.5 text-xs focus:border-indigo-400 focus:bg-white focus:outline-none',
  buttonClassName = 'shrink-0 rounded-full bg-indigo-600 p-1.5 text-white hover:bg-indigo-700 disabled:opacity-40',
}, ref) {
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const submitLockRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  const updateValue = (nextValue: string) => {
    if (inputRef.current) inputRef.current.value = nextValue;
    onDraftChange?.(nextValue);
    if (buttonRef.current) {
      buttonRef.current.disabled = submitting || !nextValue.trim();
    }
  };

  useImperativeHandle(ref, () => ({
    getValue: () => inputRef.current?.value || '',
    setValue: updateValue,
    focus: () => inputRef.current?.focus(),
  }), [onDraftChange, submitting]);

  const submit = async () => {
    const text = inputRef.current?.value.trim() || '';
    if (!text || submitLockRef.current) return;
    submitLockRef.current = true;
    setSubmitting(true);
    if (buttonRef.current) buttonRef.current.disabled = true;
    try {
      if (await onSubmit(text)) updateValue('');
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
      if (buttonRef.current) {
        buttonRef.current.disabled = !inputRef.current?.value.trim();
      }
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        data-post-comment-input={postId}
        defaultValue={initialValue}
        onChange={(event) => {
          const value = event.target.value;
          onDraftChange?.(value);
          if (buttonRef.current) buttonRef.current.disabled = submitting || !value.trim();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            void submit();
          }
        }}
        placeholder={placeholder}
        className={inputClassName}
      />
      <button
        ref={buttonRef}
        type="button"
        onClick={() => void submit()}
        disabled={!initialValue.trim() || submitting}
        aria-label="Send reply"
        className={`${buttonClassName} cursor-pointer`}
      >
        <Send className="h-3.5 w-3.5" />
      </button>
    </>
  );
}));
