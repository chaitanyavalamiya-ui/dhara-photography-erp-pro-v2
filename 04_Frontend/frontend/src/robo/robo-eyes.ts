import type { RoboLifeState } from './robo-life';

export const ROBO_NAMED_EYE_PARTS = ['EyeLeft', 'EyeRight', 'EyeCoreLeft', 'EyeCoreRight', 'LidLeft', 'LidRight'] as const;

export interface RoboEyeCapability {
  namedParts: boolean;
  overlay: boolean;
}

export function inspectEyeCapability(names: Iterable<string>): RoboEyeCapability {
  const set = new Set(names);
  const namedParts = ROBO_NAMED_EYE_PARTS.some((name) => set.has(name));
  return { namedParts, overlay: !namedParts };
}

export function eyeGlowForLife(life: RoboLifeState): { pulse: number; color: string } {
  if (life === 'listening') return { pulse: 1.35, color: '#5ee4f2' };
  if (life === 'speaking') return { pulse: 1.15, color: '#7af6ff' };
  if (life === 'thinking') return { pulse: 0.7, color: '#93c5fd' };
  if (life === 'error') return { pulse: 0.45, color: '#fb7185' };
  if (life === 'hidden' || life === 'inspect') return { pulse: 0.2, color: '#67e8f9' };
  return { pulse: 0.85, color: '#5ee4f2' };
}
