import { useState, useEffect, useRef, useCallback } from 'react';

export function useMetronome() {
  const [bpm, setBpmState] = useState(120);
  const bpmRef = useRef(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [beat, setBeat] = useState(0);

  const setBpm = useCallback((newBpm: number) => {
    setBpmState(newBpm);
    bpmRef.current = newBpm;
  }, []);

  const audioContext = useRef<AudioContext | null>(null);
  const nextNoteTime = useRef(0);
  const timerID = useRef<number | null>(null);

  // Mobile-optimized timing constants
  const lookahead = 15.0; // Check every 15ms
  const scheduleAheadTime = 0.2; // Schedule 200ms ahead (safer for mobile throttling)

  const playClick = useCallback((time: number) => {
    if (!audioContext.current) return;

    const osc = audioContext.current.createOscillator();
    const envelope = audioContext.current.createGain();

    // Frequency and Volume
    osc.frequency.value = 1000;

    // Sine is easier on mobile speakers than Square, preventing distortion at high volumes
    osc.type = 'sine';

    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(0.2, time + 0.005); // Faster attack
    envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.05); // More natural decay

    osc.connect(envelope);
    envelope.connect(audioContext.current.destination);

    osc.start(time);
    osc.stop(time + 0.06);

    // Garbage collection optimization
    osc.onended = () => {
      osc.disconnect();
      envelope.disconnect();
    };
  }, []);

  const scheduler = useCallback(() => {
    if (!audioContext.current) return;

    // Use a while loop to schedule notes while the current time is close to next note
    while (nextNoteTime.current < audioContext.current.currentTime + scheduleAheadTime) {
      playClick(nextNoteTime.current);

      const secondsPerBeat = 60.0 / bpmRef.current;

      // Update the visual beat sync
      // Note: We use setTimeout for the visual update to match the scheduled audio time
      const delayMs = Math.max(0, (nextNoteTime.current - audioContext.current.currentTime) * 1000);
      setTimeout(() => {
        if (isPlaying) {
          setBeat(prev => (prev + 1) % 4);
        }
      }, delayMs);

      nextNoteTime.current += secondsPerBeat;
    }
    timerID.current = window.setTimeout(scheduler, lookahead);
  }, [playClick, isPlaying]);

  const toggleMetronome = () => {
    // Crucial for mobile: Resume AudioContext on every user interaction
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        latencyHint: 'interactive'
      });
    }

    if (audioContext.current.state === 'suspended') {
      audioContext.current.resume();
    }

    if (!isPlaying) {
      setIsPlaying(true);
      setBeat(0);
      nextNoteTime.current = audioContext.current.currentTime + 0.05;
      scheduler();
    } else {
      setIsPlaying(false);
      if (timerID.current) {
        window.clearTimeout(timerID.current);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (timerID.current) window.clearTimeout(timerID.current);
      if (audioContext.current && audioContext.current.state !== 'closed') {
        audioContext.current.close();
      }
    };
  }, []);

  return { bpm, setBpm, isPlaying, toggleMetronome, beat };
}
