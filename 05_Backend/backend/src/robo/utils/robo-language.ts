export type RoboLanguage = 'gu' | 'hi' | 'en';

export function detectRoboLanguage(text: string): RoboLanguage {
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gu';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  return 'en';
}
