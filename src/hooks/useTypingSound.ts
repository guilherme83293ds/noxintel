import { useRef, useCallback } from "react";

let ctx: AudioContext | null = null;
function getCtx() {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function playKeyClick() {
  const c = getCtx();
  const t = c.currentTime;

  // short click: sine + noise burst
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.value = 800 + Math.random() * 400;
  gain.gain.setValueAtTime(0.15, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.03);

  // noise layer for mechanical feel
  const bufSize = Math.floor(c.sampleRate * 0.02);
  const buf = c.createBuffer(1, bufSize, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 3);
  const noise = c.createBufferSource();
  noise.buffer = buf;
  const ng = c.createGain();
  ng.gain.setValueAtTime(0.08, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
  noise.connect(ng).connect(c.destination);
  noise.start(t);
}

export function useTypingSound() {
  const lastKeyTime = useRef(0);

  const playKey = useCallback(() => {
    const now = Date.now();
    if (now - lastKeyTime.current < 30) return;
    lastKeyTime.current = now;
    playKeyClick();
  }, []);

  return playKey;
}
