import { useCallback, useRef } from "react";

const audioCache = new Map<string, HTMLAudioElement>();

export function useClickSound(src = "/click.mp3") {
  const srcRef = useRef(src);
  srcRef.current = src;

  const play = useCallback(() => {
    let audio = audioCache.get(srcRef.current);
    if (!audio) {
      audio = new Audio(srcRef.current);
      audio.volume = 0.3;
      audioCache.set(srcRef.current, audio);
    }
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, []);

  return play;
}
