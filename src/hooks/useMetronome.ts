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
  const lookahead = 25.0; // How frequently to call scheduling function (in milliseconds)
  const scheduleAheadTime = 0.1; // How far ahead to schedule audio (in seconds)

  const playClick = useCallback((time: number) => {
    if (!audioContext.current) return;
    
    const osc = audioContext.current.createOscillator();
    const envelope = audioContext.current.createGain();

    // Identical frequency and volume for all beats
    osc.frequency.value = 800;
    
    // Use a square wave for a fuller, more "constant" and loud sound
    osc.type = 'square';
    
    // Constant volume for the duration of the pulse (lowered to approx -5dB)
    envelope.gain.setValueAtTime(0.1, time);
    envelope.gain.setValueAtTime(0.1, time + 0.08); 
    envelope.gain.linearRampToValueAtTime(0, time + 0.1); // Smooth but quick end to avoid popping

    osc.connect(envelope);
    envelope.connect(audioContext.current.destination);

    osc.start(time);
    osc.stop(time + 0.1);
  }, []);

  const scheduler = useCallback(() => {
    if (!audioContext.current) return;

    while (nextNoteTime.current < audioContext.current.currentTime + scheduleAheadTime) {
      playClick(nextNoteTime.current);
      
      const secondsPerBeat = 60.0 / bpmRef.current;
      nextNoteTime.current += secondsPerBeat;
      setBeat(prev => (prev + 1) % 4);
    }
    timerID.current = window.setTimeout(scheduler, lookahead);
  }, [playClick]);

  const toggleMetronome = () => {
    if (!isPlaying) {
      if (!audioContext.current) {
        audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      if (audioContext.current.state === 'suspended') {
        audioContext.current.resume();
      }

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
    };
  }, []);

  return { bpm, setBpm, isPlaying, toggleMetronome, beat };
}
