export const ROBO_POSITIONS = [
  'bottom-right',
  'bottom-left',
  'top-right',
  'top-left',
  'center-right',
  'center-left',
] as const;

export type RoboPosition = (typeof ROBO_POSITIONS)[number];

export const DEFAULT_ROBO_POSITION: RoboPosition = 'bottom-right';
