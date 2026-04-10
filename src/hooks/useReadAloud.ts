'use client';

import { useState, useCallback, useEffect } from 'react';

export function useReadAloud() {
  const [isPlaying, setIsPlaying] = useState(false);

  const available = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const speak = useCallback(
    (text: string) => {
      if (!available) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.92;
      utterance.lang = 'en-US';
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      setIsPlaying(true);
      window.speechSynthesis.speak(utterance);
    },
    [available],
  );

  const stop = useCallback(() => {
    if (!available) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  }, [available]);

  useEffect(() => {
    return () => {
      if (available) window.speechSynthesis.cancel();
    };
  }, [available]);

  return { speak, stop, isPlaying };
}
