import React from 'react';

interface NetworkLogoProps {
  size?: number;
  className?: string;
}

// Matches the exact app icon — purple gradient bg, N lettermark with node dots
export default function NetworkLogo({ size = 40, className = '' }: NetworkLogoProps) {
  const r = size * 0.22;           // corner radius
  const cx = size / 2;
  const cy = size / 2;
  const s = size / 512;            // scale factor from 512px design

  // N strokes (from icon.svg design, scaled)
  const lx = 168 * s;
  const rx = 344 * s;
  const ty = 155 * s;
  const by = 358 * s;
  const sw = 36 * s;
  const nodeBig = 18 * s;
  const nodeMid = 14 * s;
  const nodeInner = 9 * s;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={`nlBg-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3730a3" />
          <stop offset="45%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <radialGradient id={`nlGlow-${size}`} cx="50%" cy="35%" r="55%">
          <stop offset="0%" stopColor="rgba(167,139,250,0.5)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <radialGradient id={`nlNode-${size}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#7c3aed" />
        </radialGradient>
      </defs>

      {/* Background */}
      <rect width={size} height={size} rx={r} ry={r} fill={`url(#nlBg-${size})`} />
      <rect width={size} height={size} rx={r} ry={r} fill={`url(#nlGlow-${size})`} />

      {/* N strokes */}
      <line x1={lx} y1={ty} x2={lx} y2={by} stroke="#c4b5fd" strokeWidth={sw} strokeLinecap="round" />
      <line x1={rx} y1={ty} x2={rx} y2={by} stroke="#c4b5fd" strokeWidth={sw} strokeLinecap="round" />
      <line x1={lx} y1={ty} x2={rx} y2={by} stroke="#a78bfa" strokeWidth={sw} strokeLinecap="round" />

      {/* Corner node dots */}
      {[{ x: lx, y: ty }, { x: lx, y: by }, { x: rx, y: ty }, { x: rx, y: by }].map((pt, i) => (
        <g key={i}>
          <circle cx={pt.x} cy={pt.y} r={nodeBig} fill="#7c3aed" opacity={0.4} />
          <circle cx={pt.x} cy={pt.y} r={nodeMid} fill={`url(#nlNode-${size})`} />
          <circle cx={pt.x} cy={pt.y} r={nodeInner} fill="white" />
        </g>
      ))}

      {/* Top-right ambient cluster (small decorative nodes) */}
      <circle cx={size * 0.78} cy={size * 0.18} r={size * 0.04} fill="rgba(196,181,253,0.5)" />
      <circle cx={size * 0.85} cy={size * 0.27} r={size * 0.025} fill="rgba(167,139,250,0.4)" />
      <line x1={size * 0.78} y1={size * 0.18} x2={size * 0.85} y2={size * 0.27} stroke="rgba(167,139,250,0.3)" strokeWidth={size * 0.006} />
    </svg>
  );
}
