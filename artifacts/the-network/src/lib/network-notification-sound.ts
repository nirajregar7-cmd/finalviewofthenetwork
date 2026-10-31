let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  const audioWindow = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const AudioContextConstructor = audioWindow.AudioContext || audioWindow.webkitAudioContext;
  if (!AudioContextConstructor) return null;

  audioContext ??= new AudioContextConstructor();
  return audioContext;
}

/**
 * Mobile browsers require audio playback to be unlocked from a user gesture.
 * Call this from a one-time pointer or keyboard event in the app shell.
 */
export async function unlockNetworkNotificationSound(): Promise<void> {
  try {
    const context = getAudioContext();
    if (context?.state === 'suspended') await context.resume();
  } catch {
    // Audio is an enhancement; notification delivery must still work silently.
  }
}

/**
 * A short G-B-D-B motif gives foreground alerts a recognizable Network sound.
 */
export function playNetworkNotificationSound(): void {
  try {
    const context = getAudioContext();
    if (!context || context.state !== 'running') return;

    const notes = [
      { frequency: 783.99, start: 0, duration: 0.13, volume: 0.14 },
      { frequency: 987.77, start: 0.12, duration: 0.15, volume: 0.13 },
      { frequency: 1174.66, start: 0.25, duration: 0.2, volume: 0.12 },
      { frequency: 987.77, start: 0.45, duration: 0.28, volume: 0.11 },
    ];

    for (const note of notes) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const startAt = context.currentTime + note.start;

      oscillator.type = 'sine';
      oscillator.frequency.value = note.frequency;
      oscillator.connect(gain);
      gain.connect(context.destination);
      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(note.volume, startAt + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + note.duration);
      oscillator.start(startAt);
      oscillator.stop(startAt + note.duration + 0.025);
    }
  } catch {
    // A suspended or unavailable audio device must not interrupt app behavior.
  }
}