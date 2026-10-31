import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const STAGES = ['Idea', 'Prototype', 'MVP', 'Launched 🚀'];

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 3000), // rocket appears
      setTimeout(() => setPhase(4), 4500), // rocket lifts
      setTimeout(() => setPhase(5), 7500), // exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: '0%' }}
      exit={{ opacity: 0, scale: 1.5, filter: 'blur(20px)' }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex w-full max-w-[90vw] h-[80vh]">
        
        {/* Left: Text & Rocket */}
        <div className="w-[45%] flex flex-col justify-center pr-12 relative">
          <motion.h2 
            className="text-[4.5vw] font-black leading-none text-white font-display mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8 }}
          >
            Turn talk into<br/>
            <span className="text-indigo-400">action.</span>
          </motion.h2>
          <motion.p
            className="text-[1.5vw] text-slate-300 font-body max-w-lg mb-12"
            initial={{ opacity: 0 }}
            animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Project boards to track your startup from napkin sketch to full launch.
          </motion.p>

          {/* 3D Rocket Asset */}
          <motion.div
            className="absolute bottom-10 left-[10vw] w-[25vw] h-[25vw]"
            initial={{ y: '50vh', opacity: 0, rotate: -15 }}
            animate={
              phase >= 4 ? { y: '-120vh', opacity: 1, rotate: 10 } :
              phase >= 3 ? { y: 0, opacity: 1, rotate: -5 } : 
              { y: '50vh', opacity: 0, rotate: -15 }
            }
            transition={
              phase >= 4 ? { duration: 1.5, ease: 'easeIn' } :
              { duration: 1.5, type: 'spring', bounce: 0.4 }
            }
          >
            <img 
              src={`${import.meta.env.BASE_URL}images/rocket-3d.png`} 
              alt="Rocket" 
              className="w-full h-full object-contain filter drop-shadow-[0_20px_50px_rgba(99,102,241,0.6)]"
            />
          </motion.div>
        </div>

        {/* Right: Project Board UI */}
        <div className="w-[55%] flex items-center justify-center relative">
          <motion.div 
            className="w-full bg-[#12121a] border border-white/10 rounded-2xl p-6 shadow-2xl"
            initial={{ opacity: 0, rotateY: -30, z: -100 }}
            animate={phase >= 2 ? { opacity: 1, rotateY: -10, z: 0 } : { opacity: 0, rotateY: -30, z: -100 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{ perspective: 1500, transformStyle: 'preserve-3d' }}
          >
            <div className="flex gap-4 h-[50vh]">
              {STAGES.map((stage, colIndex) => (
                <div key={stage} className="flex-1 bg-white/5 rounded-xl p-4 flex flex-col gap-4 relative overflow-hidden">
                  <div className="text-[1.2vw] font-bold text-white/80">{stage}</div>
                  
                  {/* Fake Cards */}
                  <motion.div 
                    className="w-full h-24 bg-white/10 rounded-lg p-3 border border-white/5"
                    initial={{ opacity: 0, y: 20 }}
                    animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                    transition={{ delay: 0.5 + (colIndex * 0.2) }}
                  >
                    <div className="w-3/4 h-3 bg-indigo-500/50 rounded-full mb-3" />
                    <div className="w-full h-2 bg-white/20 rounded-full mb-2" />
                    <div className="w-5/6 h-2 bg-white/20 rounded-full" />
                  </motion.div>

                  {/* Active Card moving */}
                  {colIndex === 0 && (
                    <motion.div
                      className="absolute z-50 w-[calc(100%-2rem)] h-24 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg p-3 shadow-xl"
                      initial={{ left: '1rem', top: '5rem' }}
                      animate={
                        phase >= 4 ? { left: '330%', top: '5rem', rotate: 5, scale: 1.05 } :
                        phase >= 3 ? { left: '120%', top: '5rem', rotate: 2, scale: 1.05 } :
                        { left: '1rem', top: '5rem' }
                      }
                      transition={{ duration: 0.8, type: 'spring' }}
                    >
                      <div className="w-3/4 h-3 bg-white/80 rounded-full mb-3" />
                      <div className="w-full h-2 bg-white/40 rounded-full mb-2" />
                      <div className="w-5/6 h-2 bg-white/40 rounded-full" />
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

      </div>
    </motion.div>
  );
}