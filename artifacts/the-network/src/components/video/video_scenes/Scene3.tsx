import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2800),
      setTimeout(() => setPhase(4), 7000), // exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0, clipPath: 'circle(0% at 50% 50%)' }}
      animate={{ opacity: 1, clipPath: 'circle(150% at 50% 50%)' }}
      exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
      transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="text-center relative z-20 w-full max-w-5xl px-8 mt-[-10vh]">
        <motion.h2 
          className="text-[4.5vw] font-black leading-tight text-white font-display mb-4"
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 1, type: 'spring' }}
        >
          Smart matching connects<br/>you with the right people.
        </motion.h2>
      </div>

      {/* Abstract Network Visual */}
      <div className="relative w-full h-[50vh] mt-8 flex items-center justify-center">
        
        {/* Center Node (You) */}
        <motion.div
          className="absolute z-30 w-[8vw] h-[8vw] rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-[0_0_50px_rgba(99,102,241,0.5)] border-4 border-indigo-400"
          initial={{ scale: 0 }}
          animate={phase >= 2 ? { scale: 1 } : { scale: 0 }}
          transition={{ type: 'spring', bounce: 0.5, duration: 1 }}
        >
          <span className="text-[2vw] font-bold text-white">YOU</span>
        </motion.div>

        {/* Orbiting Nodes (Matches) */}
        {[
          { label: 'Design UI', angle: 0, dist: '20vw', color: 'from-pink-500 to-rose-500', delay: 0.2 },
          { label: 'Frontend', angle: 72, dist: '22vw', color: 'from-cyan-500 to-blue-500', delay: 0.4 },
          { label: 'Backend', angle: 144, dist: '18vw', color: 'from-emerald-500 to-teal-500', delay: 0.6 },
          { label: 'Marketing', angle: 216, dist: '25vw', color: 'from-amber-500 to-orange-500', delay: 0.8 },
          { label: 'Co-founder', angle: 288, dist: '19vw', color: 'from-violet-500 to-purple-500', delay: 1.0 },
        ].map((node, i) => (
          <motion.div
            key={i}
            className="absolute z-20 flex items-center justify-center"
            style={{
              width: '100%',
              height: '100%',
              transform: `rotate(${node.angle}deg)`,
            }}
            initial={{ opacity: 0 }}
            animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 1, delay: node.delay }}
          >
            <div 
              className="absolute flex items-center justify-center flex-col"
              style={{ transform: `translateY(-${node.dist}) rotate(-${node.angle}deg)` }}
            >
              <motion.div 
                className={`w-[5vw] h-[5vw] rounded-full bg-gradient-to-tr ${node.color} flex items-center justify-center shadow-lg border-2 border-white/20`}
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 0.5, ease: 'easeInOut' }}
              >
                <div className="w-[80%] h-[80%] rounded-full bg-[#12121a] flex items-center justify-center">
                  <span className="w-1/2 h-1/2 rounded-full bg-white/20" />
                </div>
              </motion.div>
              <div className="mt-3 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-[0.8vw] font-bold whitespace-nowrap">
                {node.label}
              </div>
            </div>
            
            {/* Connecting lines */}
            <motion.div
              className="absolute top-1/2 left-1/2 origin-left bg-gradient-to-r from-indigo-500/80 to-transparent"
              style={{ height: '2px' }}
              initial={{ width: 0 }}
              animate={phase >= 3 ? { width: `calc(${node.dist} - 4vw)` } : { width: 0 }}
              transition={{ duration: 1, delay: node.delay + 0.3 }}
            />
          </motion.div>
        ))}

        {/* Pulsing Match Rings */}
        <motion.div
          className="absolute z-10 rounded-full border border-indigo-500/30"
          initial={{ width: '8vw', height: '8vw', opacity: 0 }}
          animate={phase >= 3 ? { width: '40vw', height: '40vw', opacity: [0, 0.5, 0] } : { opacity: 0 }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
        />
        <motion.div
          className="absolute z-10 rounded-full border border-purple-500/20"
          initial={{ width: '8vw', height: '8vw', opacity: 0 }}
          animate={phase >= 3 ? { width: '50vw', height: '50vw', opacity: [0, 0.3, 0] } : { opacity: 0 }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut', delay: 1 }}
        />

      </div>
    </motion.div>
  );
}