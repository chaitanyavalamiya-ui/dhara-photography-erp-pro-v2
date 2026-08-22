export const SETTINGS_BOX_TONES = [
  'is-gold',
  'is-cyan',
  'is-magenta',
  'is-amber',
  'is-purple',
  'is-green',
  'is-rose',
  'is-teal',
  'is-sky',
  'is-coral',
  'is-lime',
  'is-ice',
] as const;

export type SettingsBoxTone = (typeof SETTINGS_BOX_TONES)[number];

export function settingsBoxTone(index: number): SettingsBoxTone {
  return SETTINGS_BOX_TONES[Math.abs(index) % SETTINGS_BOX_TONES.length];
}
