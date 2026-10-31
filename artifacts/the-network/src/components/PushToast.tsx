/**
 * PushToast — shows an in-app banner when a push notification arrives while the
 * app is already open (foreground), just like WhatsApp / Instagram.
 * The service worker sends a PUSH_FOREGROUND message; MainApp passes it here.
 */
import { useEffect, useRef, useState } from 'react';
import { Bell, X, MessageSquare, Heart, Users } from 'lucide-react';

export interface PushPayload {
  title?: string;
  body?: string;
  type?: string;
  view?: string;
  icon?: string;
  data?: Record<string, any>;
}

interface Props {
  darkMode: boolean;
  payload: PushPayload | null;
  onNavigate: (view: string, userId?: string) => void;
  onDismiss: () => void;
}

function getIcon(type?: string) {
  if (type === 'message' || type === 'group_message' || type === 'community_message' || type === 'project_message') return <MessageSquare className="w-5 h-5 text-white" />;
  if (type === 'like' || type === 'comment') return <Heart className="w-5 h-5 text-white" />;
  if (type?.startsWith('connection') || type?.startsWith('find_people')) return <Users className="w-5 h-5 text-white" />;
  return <Bell className="w-5 h-5 text-white" />;
}

function getGradient(type?: string) {
  if (type === 'message') return 'from-green-500 to-emerald-600';
  if (type === 'community_message') return 'from-emerald-500 to-teal-600';
  if (type === 'project_message') return 'from-cyan-500 to-blue-600';
  if (type === 'like') return 'from-rose-500 to-pink-600';
  if (type === 'comment') return 'from-orange-500 to-amber-600';
  if (type?.startsWith('connection')) return 'from-blue-500 to-indigo-600';
  return 'from-violet-500 to-purple-600';
}

export default function PushToast({ darkMode, payload, onNavigate, onDismiss }: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!payload) { setVisible(false); return; }
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 5000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [payload]);

  if (!payload) return null;

  const handleClick = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
    setTimeout(() => {
       onNavigate(payload.view || 'notifications', payload.data?.userId || payload.data?.communityId);
      onDismiss();
    }, 250);
  };

  return (
    <div
      onClick={handleClick}
      className={`fixed top-4 left-1/2 z-[9999] w-[calc(100%-2rem)] max-w-sm cursor-pointer
        transition-all duration-300 ease-in-out
        ${visible ? 'opacity-100 translate-y-0 -translate-x-1/2' : 'opacity-0 -translate-y-4 -translate-x-1/2 pointer-events-none'}`}
    >
      <div className={`flex items-center gap-3 px-3 py-3 rounded-2xl shadow-2xl border
        ${darkMode
          ? 'bg-[#1a1a2e]/97 border-white/10 backdrop-blur-xl'
          : 'bg-white/97 border-neutral-200 backdrop-blur-xl shadow-neutral-300/50'
        }`}
      >
        {/* Icon */}
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getGradient(payload.type)} flex items-center justify-center shrink-0 shadow-md`}>
          {getIcon(payload.type)}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
            {payload.title || 'The Network'}
          </p>
          {payload.body && (
            <p className={`text-xs truncate mt-0.5 ${darkMode ? 'text-white/60' : 'text-neutral-500'}`}>
              {payload.body}
            </p>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={(e) => { e.stopPropagation(); setVisible(false); setTimeout(onDismiss, 300); }}
          className={`p-1.5 rounded-full shrink-0 ${darkMode ? 'hover:bg-white/10' : 'hover:bg-neutral-100'}`}
        >
          <X className="w-3.5 h-3.5 opacity-40" />
        </button>
      </div>

      {/* Progress bar */}
      {visible && (
        <div className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full overflow-hidden">
          <div
             className={`h-full ${payload.type?.includes('message') ? 'bg-green-500' : 'bg-violet-500'}`}
            style={{ animation: 'shrink 5s linear forwards' }}
          />
          <style>{`@keyframes shrink { from { width: 100% } to { width: 0% } }`}</style>
        </div>
      )}
    </div>
  );
}
