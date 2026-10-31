import React from 'react';
import './NetworkLoadingScreen.css';

interface NetworkLoadingScreenProps {
  fullScreen?: boolean;
  compact?: boolean;
  className?: string;
}

export default function NetworkLoadingScreen({
  fullScreen = true,
  compact = false,
  className = '',
}: NetworkLoadingScreenProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center justify-center ${
        fullScreen
          ? 'min-h-screen bg-[#fbfaff]'
          : compact
            ? 'bg-transparent py-3'
            : 'min-h-[18rem] bg-transparent'
      } ${className}`}
    >
      <div className="flex flex-col items-center text-center">
        <div aria-hidden="true" className="relative h-[72px] w-[72px]">
          {Array.from({ length: 12 }, (_, index) => (
            <span
              key={index}
              className="network-loading-screen__dot absolute left-1/2 top-1/2 -ml-[5px] -mt-[5px] h-[10px] w-[10px] rounded-full bg-[#36383a]"
              style={{
                transform: `rotate(${index * 30}deg) translateY(-27px)`,
                animationDelay: `${index * -0.083}s`,
              }}
            />
          ))}
        </div>
        <p className="mt-5 text-sm font-medium text-slate-600">Loading...</p>
      </div>
    </div>
  );
}