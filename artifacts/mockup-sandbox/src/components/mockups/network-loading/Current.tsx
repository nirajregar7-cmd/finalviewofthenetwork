import React from 'react';
import NetworkLogo from '../network-home/_source/components/NetworkLogo';
import './_group.css';

interface NetworkLoadingScreenProps {
  title?: string;
  subtitle?: string;
  fullScreen?: boolean;
  className?: string;
  showBranding?: boolean;
}

function NetworkLoadingScreen({
  title = 'Loading The Network...',
  subtitle = 'Restoring your student network',
  fullScreen = true,
  className = '',
  showBranding = false,
}: NetworkLoadingScreenProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center justify-center bg-[#fbfaff] ${
        fullScreen ? 'min-h-screen' : 'min-h-[18rem] rounded-2xl'
      } ${className}`}
    >
      <div className="flex flex-col items-center text-center">
        {showBranding ? (
          <div className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-white/90 px-4 py-3 shadow-[0_8px_24px_rgba(91,45,245,0.08)]">
            <NetworkLogo size={52} className="shrink-0 rounded-xl shadow-sm" />
            <div className="text-left">
              <p className="text-sm font-black tracking-tight text-slate-900">The Network</p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">Connect. Learn. Grow.</p>
            </div>
          </div>
        ) : (
          <div
            aria-hidden="true"
            className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-[#5b2df5] via-[#7024f5] to-[#8b18f5] text-[44px] font-extrabold leading-none text-white shadow-[0_14px_28px_rgba(109,64,245,0.26)]"
          >
            N
          </div>
        )}
        <div
          aria-hidden="true"
          className="mt-5 h-7 w-7 animate-spin rounded-full border-[3px] border-violet-200 border-t-violet-500"
        />
        <p className={`${showBranding ? 'mt-4' : 'mt-7'} text-[18px] font-extrabold tracking-[-0.02em] text-slate-900`}>
          {title}
        </p>
        <p className={`${showBranding ? 'mt-2' : 'mt-7'} text-[15px] font-medium text-slate-500`}>
          {subtitle}
        </p>
      </div>
    </div>
  );
}

export function Current() {
  return (
    <main className="network-loading-preview min-h-screen">
      <NetworkLoadingScreen
        fullScreen
        showBranding
        title="Loading your home feed..."
        subtitle="Finding your student network"
      />
    </main>
  );
}
