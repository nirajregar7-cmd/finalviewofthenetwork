import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const SKILLS = ['React', 'Node.js', 'Figma', 'UI/UX', 'Python', 'Marketing'];
const SEEKING = ['Co-founder', 'Hackathon Partner', 'Study Buddy'];

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2500),
      setTimeout(() => setPhase(4), 3800),
      setTimeout(() => setPhase(5), 7000), // exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0, y: '20%' }}
      animate={{ opacity: 1, y: '0%' }}
      exit={{ opacity: 0, scale: 1.2, rotateX: -20 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Background large text */}
      <motion.div 
        className="absolute w-full text-center top-[15vh] select-none pointer-events-none"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={phase >= 1 ? { opacity: 0.05, scale: 1 } : { opacity: 0, scale: 0.8 }}
        transition={{ duration: 2 }}
      >
        <h2 className="text-[15vw] font-black leading-none font-display uppercase tracking-tighter">
          PROFILES
        </h2>
      </motion.div>

      <div className="relative z-10 w-full max-w-5xl flex gap-12 items-center justify-center">
        {/* Left Side: Text */}
        <div className="w-1/2 flex flex-col items-start pl-[5vw]">
          <motion.h2 
            className="text-[4vw] font-black leading-tight text-white font-display mb-6"
            initial={{ opacity: 0, x: -50 }}
            animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
            transition={{ duration: 1, type: 'spring' }}
          >
            Showcase your<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">
              superpowers.
            </span>
          </motion.h2>
          
          <motion.p
            className="text-[1.5vw] text-slate-300 font-body"
            initial={{ opacity: 0 }}
            animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            Branch, year, skills, and exactly what you're looking for.
          </motion.p>
        </div>

        {/* Right Side: Visual UI Cards */}
        <div className="w-1/2 relative h-[60vh] flex items-center justify-center">
          {/* Main Profile Card */}
          <motion.div 
            className="absolute w-[28vw] bg-[#12121a]/80 backdrop-blur-xl border border-indigo-500/30 rounded-2xl p-8 shadow-2xl shadow-indigo-500/10"
            initial={{ opacity: 0, rotateY: 30, x: 100, z: -100 }}
            animate={phase >= 2 ? { opacity: 1, rotateY: 0, x: 0, z: 0 } : { opacity: 0, rotateY: 30, x: 100, z: -100 }}
            transition={{ duration: 1.2, type: 'spring', bounce: 0.2 }}
            style={{ perspective: 1000 }}
          >
            <div className="flex items-center gap-6 mb-8">
              <div className="w-[6vw] h-[6vw] rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 p-1">
                <div className="w-full h-full rounded-full bg-[#1e1e2e] flex items-center justify-center text-[2.5vw] font-bold">
                  JS
                </div>
              </div>
              <div>
                <h3 className="text-[1.8vw] font-bold text-white font-display">Jay Sharma</h3>
                <p className="text-[1vw] text-indigo-400">Computer Science • Year 3</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-[1vw] text-slate-400 mb-3 uppercase tracking-wider font-bold">Skills</p>
              <div className="flex flex-wrap gap-2">
                {SKILLS.map((skill, i) => (
                  <motion.span 
                    key={skill}
                    className="px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[0.9vw] text-indigo-300"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={phase >= 3 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
                    transition={{ delay: i * 0.1, type: 'spring', stiffness: 300 }}
                  >
                    {skill}
                  </motion.span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[1vw] text-slate-400 mb-3 uppercase tracking-wider font-bold">Looking For</p>
              <div className="flex flex-wrap gap-2">
                {SEEKING.map((item, i) => (
                  <motion.span 
                    key={item}
                    className="px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[0.9vw] text-violet-300 flex items-center gap-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={phase >= 4 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.15, type: 'spring', stiffness: 200 }}
                  >
                    <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                    {item}
                  </motion.span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}