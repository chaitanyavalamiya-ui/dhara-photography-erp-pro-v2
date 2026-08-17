import type { RoboState } from './robo-states';

export type RoboLocomotion = 'idle' | 'walk';
export type RoboEmotion =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'confused'
  | 'surprised'
  | 'thinking'
  | 'excited'
  | 'celebrating'
  | 'wink'
  | 'shy'
  | 'sleepy'
  | 'offline';

export function emotionFromState(state: RoboState): RoboEmotion {
  if (state === 'happy' || state === 'success') return 'happy';
  if (state === 'sad') return 'sad';
  if (state === 'angry') return 'angry';
  if (state === 'confused' || state === 'error') return 'confused';
  if (state === 'surprised' || state === 'alert' || state === 'listening') return 'surprised';
  if (state === 'thinking') return 'thinking';
  if (state === 'celebrating') return 'celebrating';
  if (state === 'wink') return 'wink';
  if (state === 'shy') return 'shy';
  if (state === 'greeting') return 'excited';
  if (state === 'offline' || state === 'hidden') return 'offline';
  if (state === 'talking' || state === 'speaking' || state === 'guiding' || state === 'teaching') return 'happy';
  return 'neutral';
}

export function clampLook(value: number, limit: number): number {
  return Math.min(limit, Math.max(-limit, value));
}

export function walkCycle(time: number) {
  const phase = time * 7.2;
  const left = Math.sin(phase);
  const right = Math.sin(phase + Math.PI);
  return {
    thighL: left * 0.55,
    thighR: right * 0.55,
    shinL: Math.max(0, left) * 0.42,
    shinR: Math.max(0, right) * 0.42,
    armL: right * 0.35,
    armR: left * 0.35,
    bounce: Math.abs(Math.sin(phase * 2)) * 0.03,
  };
}

export function dancePose(time: number) {
  const t = time * 6.2;
  return {
    bounce: Math.abs(Math.sin(t * 2)) * 0.05,
    sway: Math.sin(t) * 0.12,
    armL: -0.6 + Math.sin(t) * 0.45,
    armR: -0.6 + Math.cos(t) * 0.45,
    head: Math.sin(t * 1.4) * 0.18,
  };
}

export function wavePose(time: number) {
  return {
    armR: -1.28 + Math.sin(time * 8) * 0.22,
    head: Math.sin(time * 3) * 0.08,
  };
}

export function livingIdle(time: number) {
  return {
    breathe: Math.sin(time * 1.45) * 0.016,
    sway: Math.sin(time * 0.62) * 0.035,
    headBob: Math.sin(time * 0.9) * 0.025,
    headTilt: Math.sin(time * 0.37) * 0.045,
    wave: Math.sin(time * 2.15) * 0.06,
    glow: 2.05 + (Math.sin(time * 2.4) * 0.5 + 0.5) * 0.4,
  };
}

/** Wrapper-only idle for a single full-body mesh (no bones). Layered slow sines, never a shake. */
export function meshIdleFloat(time: number) {
  return {
    y: Math.sin(time * 0.82) * 0.03 + Math.sin(time * 0.31) * 0.01,
    x: Math.sin(time * 0.47) * 0.009,
    yaw: Math.sin(time * 0.39) * 0.038,
    roll: Math.sin(time * 0.51) * 0.014,
    pitch: Math.sin(time * 0.67) * 0.009,
  };
}

/** Distance that keeps the full bounding sphere inside a perspective frustum. */
export function roboCameraDistance(radius: number, fovDeg: number, margin = 1.28): number {
  const halfFov = (fovDeg * Math.PI) / 360;
  return (Math.max(0.01, radius) * margin) / Math.sin(halfFov);
}

export function shouldBlink(now: number, lastBlink: number, nextGap: number): boolean {
  return now - lastBlink >= nextGap;
}

export function nextBlinkGap(random = Math.random): number {
  return 2800 + random() * 3200;
}
