import React, { useState } from 'react';
import { Loader2, MoreVertical, Pencil, Repeat2, Trash2 } from 'lucide-react';

interface PostActionMenuProps {
  canEdit?: boolean;
  canDelete?: boolean;
  canReshare?: boolean;
  reshareBusy?: boolean;
  onEdit?: () => void;
  onDelete?: () => void | Promise<void>;
  onReshare?: () => void | Promise<void>;
}

export const PostActionMenu: React.FC<PostActionMenuProps> = ({
  canEdit = false,
  canDelete = false,
  canReshare = true,
  reshareBusy = false,
  onEdit,
  onDelete,
  onReshare,
}) => {
  const [open, setOpen] = useState(false);
  const hasActions = canEdit || canDelete || (canReshare && Boolean(onReshare));
  if (!hasActions) return null;

  const run = async (action?: () => void | Promise<void>) => {
    setOpen(false);
    if (action) await action();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700 cursor-pointer"
        aria-label="Post actions"
        aria-expanded={open}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-40 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
          {canEdit && (
            <button
              type="button"
              onClick={() => void run(onEdit)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit post
            </button>
          )}
          {canReshare && onReshare && (
            <button
              type="button"
              disabled={reshareBusy}
              onClick={() => void run(onReshare)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50 cursor-pointer"
            >
              {reshareBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Repeat2 className="h-3.5 w-3.5" />}
              {reshareBusy ? 'Resharing…' : 'Reshare'}
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => void run(onDelete)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete post
            </button>
          )}
        </div>
      )}
    </div>
  );
};