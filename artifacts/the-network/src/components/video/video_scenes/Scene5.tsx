import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1800),
      setTimeout(() => setPhase(3), 3000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-[#09090b]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5 }}
    >
      {/* Massive subtle background logo/text */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={phase >= 1 ? { scale: 1, opacity: 0.03 } : { scale: 0.8, opacity: 0 }}
        transition={{ duration: 3, ease: 'easeOut' }}
      >
        <span className="text-[30vw] font-black font-display tracking-tighter uppercase whitespace-nowrap text-indigo-500">
          NETWORK
        </span>
      </motion.div>

      <div className="relative z-10 text-center flex flex-col items-center">
        
        {/* Logo/Icon */}
        <motion.div
          className="w-[10vw] h-[10vw] rounded-3xl bg-gradient-to-tr from-indigo-500 to-purple-600 mb-10 flex items-center justify-center shadow-[0_0_80px_rgba(99,102,241,0.6)]"
          initial={{ opacity: 0, scale: 0, rotate: -45 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1, rotate: 0 } : { opacity: 0, scale: 0, rotate: -45 }}
          transition={{ duration: 1.2, type: 'spring', bounce: 0.5 }}
        >
          <svg className="w-[5vw] h-[5vw] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </motion.div>

        {/* Title */}
        <motion.h1 
          className="text-[6vw] font-black tracking-tighter text-white font-display mb-4"
          initial={{ opacity: 0, y: 40 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 1, type: 'spring', bounce: 0.3 }}
        >
          The Network
        </motion.h1>

        {/* Tagline */}
        <motion.p
          className="text-[2vw] text-indigo-200 font-body font-medium"
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1 }}
        >
          Where campus ideas find their team.
        </motion.p>
        
        {/* Subtle decorative line */}
        <motion.div
          className="mt-12 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent"
          initial={{ width: 0, opacity: 0 }}
          animate={phase >= 3 ? { width: '30vw', opacity: 0.5 } : { width: 0, opacity: 0 }}
          transition={{ duration: 1.5, delay: 0.5, ease: 'easeInOut' }}
        />

      </div>
    </motion.div>
  );
}