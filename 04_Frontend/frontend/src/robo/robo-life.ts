import type { RoboLocomotion } from './robo-3d-motion';
import type { RoboState } from './robo-states';

export const ROBO_LIFE_STATES = [
  'idle',
  'walking',
  'listening',
  'thinking',
  'speaking',
  'greeting',
  'pointing',
  'celebrating',
  'success',
  'error',
  'inspect',
  'hidden',
] as const;

export type RoboLifeState = (typeof ROBO_LIFE_STATES)[number];

export interface RoboLifeInput {
  visible: boolean;
  inspect: boolean;
  listening: boolean;
  speaking: boolean;
  loading: boolean;
  locomotion: RoboLocomotion;
  state: RoboState;
}

/** Single resolver so overlay, voice, and 3D do not each invent their own flags. */
export function resolveRoboLife(input: RoboLifeInput): RoboLifeState {
  if (!input.visible) return 'hidden';
  if (input.inspect) return 'inspect';
  if (input.listening) return 'listening';
  if (input.locomotion === 'walk' || input.state === 'walking') return 'walking';
  if (input.loading || input.state === 'thinking') return 'thinking';
  if (input.speaking || input.state === 'speaking' || input.state === 'talking') return 'speaking';
  if (input.state === 'greeting') return 'greeting';
  if (input.state === 'guiding' || input.state === 'teaching') return 'pointing';
  if (input.state === 'celebrating') return 'celebrating';
  if (input.state === 'happy' || input.state === 'success') return 'success';
  if (
    input.state === 'error' ||
    input.state === 'confused' ||
    input.state === 'sad' ||
    input.state === 'angry' ||
    input.state === 'offline'
  ) {
    return 'error';
  }
  return 'idle';
}

export function lifeToRoboState(life: RoboLifeState, fallback: RoboState = 'idle'): RoboState {
  if (life === 'walking') return 'walking';
  if (life === 'listening') return 'listening';
  if (life === 'thinking') return 'thinking';
  if (life === 'speaking') return 'talking';
  if (life === 'greeting') return 'greeting';
  if (life === 'pointing') return 'guiding';
  if (life === 'celebrating') return 'celebrating';
  if (life === 'success') return 'happy';
  if (life === 'error') return 'confused';
  if (life === 'inspect') return 'idle';
  if (life === 'hidden') return 'idle';
  return fallback;
}
