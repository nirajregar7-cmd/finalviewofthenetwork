import { useState, useEffect } from 'react';
import { Bell, X, BellRing } from 'lucide-react';
import { sendPushTest, subscribePush } from './NotificationSetup';

interface Props {
  userId: string;
  darkMode: boolean;
}

export default function NotificationBanner({ userId, darkMode }: Props) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Keep this visible when permission was denied too. A denied permission
    // needs a clear explanation instead of silently disabling OS alerts.
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') return;
    // Show after a short delay so the browser has rendered the app, while
    // still giving the user a clear gesture for Android's permission prompt.
    // Do not persist dismissal: a dismissed prompt must not permanently block
    // push registration on a newly installed phone.
    const t = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  const handleEnable = async () => {
    setLoading(true);
    setError('');
    if (Notification.permission === 'denied') {
      setLoading(false);
      setError('Notifications are blocked for this site. Allow them in your browser site settings, then try again.');
      return;
    }
    const ok = await subscribePush(userId).catch(() => false);
    if (!ok) {
      setLoading(false);
      setError('The device was not registered. Check Android notification permission and try again.');
      return;
    }
    // A user-initiated test confirms both token registration and OS delivery.
    const testOk = await sendPushTest(userId);
    setLoading(false);
    if (!testOk) {
      setError('Permission is enabled, but the test alert could not be sent. Please try again.');
      return;
    }
    setSuccess(true);
    setTimeout(() => setShow(false), 2500);
  };

  const dismiss = () => {
    setShow(false);
  };

  return (
    <div className={`fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-sm
      rounded-2xl shadow-2xl border backdrop-blur-xl
      ${darkMode
        ? 'bg-[#1a1a2e]/95 border-white/10 text-white'
        : 'bg-white/95 border-neutral-200 text-neutral-900'
      }
      animate-in slide-in-from-bottom-4 duration-300`}
      style={{ animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1) both' }}
    >
      <style>{`
        @keyframes slideUp {
          from { transform: translateX(-50%) translateY(24px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
        }
      `}</style>

      {success ? (
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
            <BellRing className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="font-semibold text-sm text-green-500">Notifications enabled! 🎉</p>
            <p className={`text-xs mt-0.5 ${darkMode ? 'text-white/60' : 'text-neutral-500'}`}>
              You'll never miss a message or connection.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4">
          <button
            onClick={dismiss}
            className={`absolute top-3 right-3 p-1 rounded-full ${darkMode ? 'hover:bg-white/10' : 'hover:bg-neutral-100'}`}
          >
            <X className="w-4 h-4 opacity-50" />
          </button>

          <div className="flex items-start gap-3">
            {/* Animated bell icon */}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg">
              <BellRing className="w-6 h-6 text-white" style={{ animation: 'bellRing 0.6s ease-in-out 0.5s both' }} />
            </div>
            <style>{`
              @keyframes bellRing {
                0%,100% { transform: rotate(0deg); }
                20%      { transform: rotate(-15deg); }
                40%      { transform: rotate(15deg); }
                60%      { transform: rotate(-8deg); }
                80%      { transform: rotate(8deg); }
              }
            `}</style>

            <div className="flex-1 min-w-0 pr-6">
              <p className="font-bold text-sm leading-snug">Stay connected, always</p>
              <p className={`text-xs mt-1 leading-relaxed ${darkMode ? 'text-white/60' : 'text-neutral-500'}`}>
                Get instant alerts for messages, connection requests, and activity — even when the app is closed.
              </p>
            </div>
          </div>

          {/* Value props */}
          <div className={`mt-3 flex gap-3 text-xs ${darkMode ? 'text-white/50' : 'text-neutral-400'}`}>
            <span>💬 Messages</span>
            <span>🤝 Connections</span>
            <span>❤️ Likes</span>
            <span>🔔 Mentions</span>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleEnable}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold
                hover:from-violet-700 hover:to-indigo-700 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
              {loading ? 'Enabling…' : Notification.permission === 'denied' ? 'Try again' : 'Enable Notifications'}
            </button>
            <button
              onClick={dismiss}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium ${darkMode ? 'bg-white/10 hover:bg-white/15' : 'bg-neutral-100 hover:bg-neutral-200'} transition-all`}
            >
              Later
            </button>
          </div>
          {error && (
            <p className={`mt-3 text-xs leading-relaxed ${darkMode ? 'text-rose-300' : 'text-rose-600'}`}>
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
