import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '../../lib/video/hooks';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

const SCENE_DURATIONS = {
  open: 7000,
  profiles: 8500,
  match: 8500,
  projects: 9000,
  close: 8000,
};

const SCENE_LINES = [
  "Introducing The Network. Where campus ideas find their team.",
  "Build your student profile. Showcase your skills, your interests, and what you're looking for in a co-founder.",
  "Our smart matching algorithm connects you with the right people across every campus.",
  "Take your startup from idea to launch. Collaborate on project boards and track every milestone together.",
  "The Network. Join thousands of student builders today. Your co-founder is waiting.",
];

const scenePos = [
  { x: '10vw', y: '10vh', scale: 1.5, opacity: 0.4 },
  { x: '60vw', y: '20vh', scale: 1.2, opacity: 0.6 },
  { x: '30vw', y: '60vh', scale: 1.8, opacity: 0.5 },
  { x: '80vw', y: '80vh', scale: 0.9, opacity: 0.8 },
  { x: '50vw', y: '50vh', scale: 2.5, opacity: 0.3 },
];

function useAmbientMusic(muted: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    ctxRef.current = ctx;
    const master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.18;
    master.connect(ctx.destination);
    gainRef.current = master;

    const notes = [130.81, 164.81, 196.00, 261.63, 329.63]; // C3, E3, G3, C4, E4
    const oscs: OscillatorNode[] = [];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.value = freq;

      filter.type = 'lowpass';
      filter.frequency.value = 800;
      filter.Q.value = 0.5;

      g.gain.value = i === 0 ? 0.5 : 0.25;

      osc.connect(filter);
      filter.connect(g);
      g.connect(master);
      osc.start();

      // Slow tremolo
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.12 + i * 0.04;
      lfoGain.gain.value = 0.04;
      lfo.connect(lfoGain);
      lfoGain.connect(g.gain);
      lfo.start();

      oscs.push(osc, lfo);
    });

    return () => {
      oscs.forEach(o => { try { o.stop(); } catch {} });
      try { ctx.close(); } catch {}
    };
  }, []);

  useEffect(() => {
    if (gainRef.current) {
      const g = gainRef.current.gain;
      const ctx = ctxRef.current;
      if (ctx) {
        g.cancelScheduledValues(ctx.currentTime);
        g.linearRampToValueAtTime(muted ? 0 : 0.18, ctx.currentTime + 0.5);
      }
    }
  }, [muted]);
}

function useSceneVoiceover(currentScene: number, muted: boolean) {
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (muted || typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const delay = setTimeout(() => {
      const utter = new SpeechSynthesisUtterance(SCENE_LINES[currentScene]);
      utterRef.current = utter;

      // Pick best available voice
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v =>
        /google.*us.*english|samantha|karen|daniel|ava/i.test(v.name)
      ) || voices.find(v => v.lang === 'en-US') || voices[0];

      if (preferred) utter.voice = preferred;
      utter.rate = 0.88;
      utter.pitch = 0.95;
      utter.volume = 0.95;

      window.speechSynthesis.speak(utter);
    }, 600);

    return () => {
      clearTimeout(delay);
      window.speechSynthesis.cancel();
    };
  }, [currentScene, muted]);
}

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });
  const [muted, setMuted] = useState(false);

  useAmbientMusic(muted);
  useSceneVoiceover(currentScene, muted);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#09090b]">

      {/* Mute / Unmute button */}
      <button
        onClick={() => setMuted(m => !m)}
        className="absolute top-5 right-5 z-50 flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm border border-white/10"
        title={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
          </svg>
        )}
      </button>

      {/* Persistent Background Layer */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-screen"
          style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-abstract.png)` }}
          animate={{ scale: [1.1, 1.15, 1.1], rotate: [0, 2, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div className="absolute w-[800px] h-[800px] rounded-full blur-[120px] opacity-40"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }}
          animate={{ x: ['-20%', '50%', '0%'], y: ['0%', '40%', '-10%'], scale: [1, 1.2, 0.9] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div className="absolute w-[600px] h-[600px] rounded-full blur-[100px] opacity-30 right-0 bottom-0"
          style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }}
          animate={{ x: ['20%', '-30%', '10%'], y: ['10%', '-40%', '20%'] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute inset-0 bg-cover bg-center mix-blend-screen"
          style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/nodes-bg.png)` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: currentScene === 2 || currentScene === 3 ? 0.35 : 0 }}
          transition={{ duration: 1.5 }}
        />
      </div>

      {/* Persistent Midground Accent */}
      <motion.div
        className="absolute w-[30vw] h-[30vw] rounded-full border border-indigo-500/20"
        animate={scenePos[currentScene]}
        transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        className="absolute h-[1px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent"
        animate={{
          left: ['-20%', '10%', '40%', '20%', '-10%'][currentScene],
          width: ['150%', '80%', '40%', '100%', '120%'][currentScene],
          top: ['40%', '80%', '20%', '60%', '50%'][currentScene],
          opacity: [0.2, 0.5, 0.8, 0.6, 0.3][currentScene],
        }}
        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
      />

      {/* Foreground Content Scenes */}
      <AnimatePresence mode="sync">
        {currentScene === 0 && <Scene1 key="open" />}
        {currentScene === 1 && <Scene2 key="profiles" />}
        {currentScene === 2 && <Scene3 key="match" />}
        {currentScene === 3 && <Scene4 key="projects" />}
        {currentScene === 4 && <Scene5 key="close" />}
      </AnimatePresence>
    </div>
  );
}
