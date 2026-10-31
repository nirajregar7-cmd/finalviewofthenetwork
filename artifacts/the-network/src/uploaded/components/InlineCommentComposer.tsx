import React, {
  forwardRef,
  memo,
  useCallback,
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
  submitting: boolean;
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
  submitting,
  onSubmit,
  initialValue = '',
  onDraftChange,
  inputClassName = 'min-w-[150px] flex-1 basis-[150px] rounded-full border border-transparent bg-slate-100 px-3 py-1.5 text-xs focus:border-indigo-400 focus:bg-white focus:outline-none',
  buttonClassName = 'shrink-0 rounded-full bg-indigo-600 p-1.5 text-white hover:bg-indigo-700 disabled:opacity-40',
}, ref) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const updateValue = useCallback((nextValue: string) => {
    setValue(nextValue);
    onDraftChange?.(nextValue);
  }, [onDraftChange]);

  useImperativeHandle(ref, () => ({
    getValue: () => value,
    setValue: updateValue,
    focus: () => inputRef.current?.focus(),
  }), [updateValue, value]);

  const submit = async () => {
    const text = value.trim();
    if (!text || submitting) return;
    if (await onSubmit(text)) updateValue('');
  };

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        data-post-comment-input={postId}
        value={value}
        onChange={(event) => setValue(event.target.value)}
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
        type="button"
        onClick={() => void submit()}
        disabled={!value.trim() || submitting}
        aria-label="Send reply"
        className={`${buttonClassName} cursor-pointer`}
      >
        <Send className="h-3.5 w-3.5" />
      </button>
    </>
  );
}));
