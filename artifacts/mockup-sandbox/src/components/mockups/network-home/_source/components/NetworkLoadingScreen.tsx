import React from 'react';

interface NetworkLoadingScreenProps {
  title?: string;
  subtitle?: string;
  fullScreen?: boolean;
  className?: string;
}

export default function NetworkLoadingScreen({
  title = 'Loading The Network...',
  subtitle = 'Restoring your student network',
  fullScreen = true,
  className = '',
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
        <div
          aria-hidden="true"
          className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-[#5b2df5] via-[#7024f5] to-[#8b18f5] text-[44px] font-extrabold leading-none text-white shadow-[0_14px_28px_rgba(109,64,245,0.26)]"
        >
          N
        </div>
        <div
          aria-hidden="true"
          className="mt-5 h-7 w-7 animate-spin rounded-full border-[3px] border-violet-200 border-t-violet-500"
        />
        <p className="mt-7 text-[18px] font-extrabold tracking-[-0.02em] text-slate-900">
          {title}
        </p>
        <p className="mt-7 text-[15px] font-medium text-slate-500">
          {subtitle}
        </p>
      </div>
    </div>
  );
}