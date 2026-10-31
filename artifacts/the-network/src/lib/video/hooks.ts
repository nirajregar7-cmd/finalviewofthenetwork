import { useState, useEffect } from 'react';

declare global {
  interface Window {
    startRecording?: () => void;
    stopRecording?: () => void;
  }
}

export function useVideoPlayer({ durations }: { durations: Record<string, number> }) {
  const [currentScene, setCurrentScene] = useState(0);
  const sceneKeys = Object.keys(durations);

  useEffect(() => {
    window.startRecording?.();
    let timeout: NodeJS.Timeout;
    
    const playScene = (index: number) => {
      setCurrentScene(index);
      const duration = durations[sceneKeys[index]];
      timeout = setTimeout(() => {
        if (index === sceneKeys.length - 1) {
          window.stopRecording?.();
          playScene(0); // loop
        } else {
          playScene(index + 1);
        }
      }, duration);
    };
    
    playScene(0);
    return () => clearTimeout(timeout);
  }, [JSON.stringify(durations)]); 

  return { currentScene, sceneKeys };
}