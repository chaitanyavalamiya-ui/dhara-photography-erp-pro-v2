export const DHARA_THEME_STORAGE_KEY = 'dhara-theme';
export const DEFAULT_DHARA_THEME = 'royal-cinematic';

export const RETIRED_DHARA_THEME_IDS = ['champagne-luxury'] as const;

export const DHARA_THEME_IDS = [
  'royal-cinematic',
  'royal-black-gold',
  'midnight-studio',
  'futuristic-cyan',
  'emerald-royal',
  'sapphire-luxury',
  'rose-gold-wedding',
  'black-and-white',
  'royal-ivory',
  'midnight-dark',
] as const;

export type DharaThemeId = (typeof DHARA_THEME_IDS)[number];

export interface DharaThemeDefinition {
  id: DharaThemeId;
  name: string;
  description: string;
  swatches: [string, string, string];
  approved: boolean;
}

export const DHARA_THEMES: DharaThemeDefinition[] = [
  {
    id: 'royal-cinematic',
    name: 'Dhara Royal Cinematic',
    description: 'Luxury wedding studio with warm chandelier gold.',
    swatches: ['#14090C', '#5A1520', '#C9A227'],
    approved: true,
  },
  {
    id: 'royal-black-gold',
    name: 'Royal Black Gold',
    description: 'Jewellery-black surfaces with metallic gold.',
    swatches: ['#050505', '#1A140C', '#D4AF37'],
    approved: true,
  },
  {
    id: 'midnight-studio',
    name: 'Midnight Studio',
    description: 'Professional camera-room navy and silver.',
    swatches: ['#070B14', '#1A2744', '#C9CDD6'],
    approved: true,
  },
  {
    id: 'futuristic-cyan',
    name: 'Futuristic Cyan',
    description: 'Quiet command-center cyan, not a game UI.',
    swatches: ['#050A12', '#0E2A36', '#5EE4F2'],
    approved: true,
  },
  {
    id: 'emerald-royal',
    name: 'Emerald Royal',
    description: 'Heritage palace green with antique gold.',
    swatches: ['#050A08', '#163024', '#C6A15A'],
    approved: false,
  },
  {
    id: 'sapphire-luxury',
    name: 'Sapphire Luxury',
    description: 'Night-wedding sapphire with platinum light.',
    swatches: ['#05070E', '#152448', '#C9C6BC'],
    approved: false,
  },
  {
    id: 'rose-gold-wedding',
    name: 'Rose Gold Wedding',
    description: 'Romantic bridal studio in rose gold and ivory.',
    swatches: ['#140C0A', '#5A2C2C', '#C9A07A'],
    approved: false,
  },
  {
    id: 'black-and-white',
    name: 'Black & White',
    description: 'Editorial monochrome wedding studio.',
    swatches: ['#0A0A0A', '#1A1A1A', '#F5F5F5'],
    approved: true,
  },
  {
    id: 'royal-ivory',
    name: 'Royal Ivory',
    description: 'Light wedding-album ivory with champagne bronze.',
    swatches: ['#F5F1E8', '#FFFCF6', '#B08A57'],
    approved: true,
  },
  {
    id: 'midnight-dark',
    name: 'Midnight Dark',
    description: 'Deep navy-black glass with neon cyan.',
    swatches: ['#020617', '#00D2FF', '#9F1239'],
    approved: true,
  },
];

export function isDharaThemeId(value: string | null | undefined): value is DharaThemeId {
  return DHARA_THEME_IDS.includes(value as DharaThemeId);
}

export function isRetiredDharaThemeId(value: string | null | undefined): boolean {
  return RETIRED_DHARA_THEME_IDS.includes(value as (typeof RETIRED_DHARA_THEME_IDS)[number]);
}
