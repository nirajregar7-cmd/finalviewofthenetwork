import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1800),
      setTimeout(() => setPhase(3), 3200),
      setTimeout(() => setPhase(4), 5500), // exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, filter: 'blur(20px)', scale: 0.9 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="text-center relative z-10 w-full max-w-6xl px-12">
        <motion.div 
          className="overflow-hidden mb-6"
          initial={{ height: 0 }}
          animate={{ height: 'auto' }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-[2vw] font-medium tracking-widest uppercase text-indigo-400 font-body">
            Introducing
          </p>
        </motion.div>

        <h1 className="text-[7.5vw] font-black tracking-tighter leading-[0.9] text-white font-display mix-blend-plus-lighter">
          <div className="flex justify-center space-x-[2vw]">
            <motion.span
              initial={{ y: '100%', opacity: 0, rotateX: 45 }}
              animate={phase >= 1 ? { y: 0, opacity: 1, rotateX: 0 } : { y: '100%', opacity: 0, rotateX: 45 }}
              transition={{ duration: 1, type: 'spring', bounce: 0.3 }}
            >
              Where
            </motion.span>
            <motion.span
              initial={{ y: '100%', opacity: 0, rotateX: 45 }}
              animate={phase >= 1 ? { y: 0, opacity: 1, rotateX: 0 } : { y: '100%', opacity: 0, rotateX: 45 }}
              transition={{ duration: 1, type: 'spring', bounce: 0.3, delay: 0.1 }}
              className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-500"
            >
              campus ideas
            </motion.span>
          </div>
          
          <div className="flex justify-center mt-2">
            <motion.span
              initial={{ y: '100%', opacity: 0, filter: 'blur(10px)' }}
              animate={phase >= 2 ? { y: 0, opacity: 1, filter: 'blur(0px)' } : { y: '100%', opacity: 0, filter: 'blur(10px)' }}
              transition={{ duration: 1.2, type: 'spring', bounce: 0.2 }}
            >
              find their team.
            </motion.span>
          </div>
        </h1>

        <motion.div
          className="mt-12 mx-auto w-[1px] bg-gradient-to-b from-indigo-500 to-transparent"
          initial={{ height: 0, opacity: 0 }}
          animate={phase >= 3 ? { height: '15vh', opacity: 1 } : { height: 0, opacity: 0 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      </div>

      {/* Decorative floating grids */}
      <motion.div
        className="absolute top-0 right-0 w-[40vw] h-[40vw] border-b border-l border-indigo-500/10"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(99,102,241,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(99,102,241,0.05) 1px, transparent 1px)',
          backgroundSize: '4vw 4vw'
        }}
        initial={{ opacity: 0, x: '100%' }}
        animate={phase >= 1 ? { opacity: 1, x: '20%' } : { opacity: 0, x: '100%' }}
        transition={{ duration: 2, ease: 'easeOut' }}
      />
    </motion.div>
  );
}