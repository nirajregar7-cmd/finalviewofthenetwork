import React from 'react';
import './_group.css';

interface DotsOnlyProps {
  fullScreen?: boolean;
  className?: string;
}

export function DotsOnly({ fullScreen = false, className = '' }: DotsOnlyProps) {
  return (
    <main className="network-loading-preview flex min-h-screen items-center justify-center bg-[#f2efe6] p-6">
      <div
        role="status"
        aria-live="polite"
        className={`flex w-full items-center justify-center ${
          fullScreen ? 'min-h-screen bg-[#fbfaff]' : 'min-h-[18rem] bg-transparent'
        } ${className}`}
      >
        <div className="flex flex-col items-center text-center">
          <div aria-hidden="true" className="relative h-[72px] w-[72px]">
            {Array.from({ length: 12 }, (_, index) => (
              <span
                key={index}
                className="network-loading-dot absolute left-1/2 top-1/2 -ml-[5px] -mt-[5px] h-[10px] w-[10px] rounded-full bg-[#36383a]"
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
    </main>
  );
}
