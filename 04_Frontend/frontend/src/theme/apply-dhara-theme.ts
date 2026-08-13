import {
  DEFAULT_DHARA_THEME,
  DHARA_THEME_STORAGE_KEY,
  DharaThemeId,
  isDharaThemeId,
} from './dhara-themes';

export function readDharaTheme(): DharaThemeId {
  try {
    const stored = localStorage.getItem(DHARA_THEME_STORAGE_KEY);
    if (isDharaThemeId(stored)) {
      return stored;
    }
  } catch {
    // localStorage can be unavailable in locked-down browsers
  }
  return DEFAULT_DHARA_THEME;
}

export function paintDharaTheme(themeId: DharaThemeId): DharaThemeId {
  const resolved = isDharaThemeId(themeId) ? themeId : DEFAULT_DHARA_THEME;
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-dhara-theme', resolved);
    document.body?.setAttribute('data-dhara-theme', resolved);
  }
  return resolved;
}

export function applyDharaTheme(themeId: DharaThemeId): DharaThemeId {
  const resolved = paintDharaTheme(themeId);
  try {
    localStorage.setItem(DHARA_THEME_STORAGE_KEY, resolved);
  } catch {
    // ignore quota / private-mode write failures
  }
  return resolved;
}

export function bootstrapDharaTheme(): DharaThemeId {
  return applyDharaTheme(readDharaTheme());
}
