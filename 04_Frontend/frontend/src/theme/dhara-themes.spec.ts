import { describe, expect, it } from 'vitest';
import { DHARA_THEME_IDS, DHARA_THEMES, DEFAULT_DHARA_THEME, isDharaThemeId } from './dhara-themes';

describe('DHARA_THEMES catalog', () => {
  it('contains exactly the 10 approved catalog themes', () => {
    expect(DHARA_THEME_IDS).toHaveLength(10);
    expect(DHARA_THEMES).toHaveLength(10);
    expect(DHARA_THEMES.map((theme) => theme.name)).toEqual([
      'Dhara Royal Cinematic',
      'Royal Black Gold',
      'Midnight Studio',
      'Futuristic Cyan',
      'Emerald Royal',
      'Sapphire Luxury',
      'Rose Gold Wedding',
      'Black & White',
      'Royal Ivory',
      'Midnight Dark',
    ]);
    expect(DHARA_THEMES.some((theme) => theme.id === 'midnight-dark')).toBe(true);
    expect(DHARA_THEMES.map((theme) => theme.id as string)).not.toContain('champagne-luxury');
    expect(DHARA_THEMES.some((theme) => theme.name === 'Champagne Luxury')).toBe(false);
    expect(DEFAULT_DHARA_THEME).toBe('royal-cinematic');
    expect(isDharaThemeId('champagne-luxury')).toBe(false);
    expect(isDharaThemeId('midnight-dark')).toBe(true);
  });
});
