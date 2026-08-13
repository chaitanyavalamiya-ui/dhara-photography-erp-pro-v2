export const ROBO_STATES = [
  'idle',
  'greeting',
  'thinking',
  'talking',
  'happy',
  'sad',
  'angry',
  'confused',
  'surprised',
  'guiding',
  'teaching',
  'alert',
  'celebrating',
  'offline',
] as const;

export type RoboState = (typeof ROBO_STATES)[number];
