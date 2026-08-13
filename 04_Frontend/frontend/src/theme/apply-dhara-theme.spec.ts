import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyDharaTheme,
  bootstrapDharaTheme,
  paintDharaTheme,
  readDharaTheme,
} from './apply-dhara-theme';
import { DEFAULT_DHARA_THEME, DHARA_THEME_STORAGE_KEY } from './dhara-themes';

describe('dhara theme persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-dhara-theme');
  });

  it('defaults to royal-cinematic', () => {
    expect(readDharaTheme()).toBe(DEFAULT_DHARA_THEME);
    expect(bootstrapDharaTheme()).toBe('royal-cinematic');
    expect(document.documentElement.getAttribute('data-dhara-theme')).toBe('royal-cinematic');
  });

  it('persists a selected theme in localStorage', () => {
    applyDharaTheme('futuristic-cyan');
    expect(localStorage.getItem(DHARA_THEME_STORAGE_KEY)).toBe('futuristic-cyan');
    expect(readDharaTheme()).toBe('futuristic-cyan');
  });

  it('ignores an invalid stored theme', () => {
    localStorage.setItem(DHARA_THEME_STORAGE_KEY, 'spider-man');
    expect(readDharaTheme()).toBe('royal-cinematic');
  });

  it('falls back when a retired theme id is stored', () => {
    localStorage.setItem(DHARA_THEME_STORAGE_KEY, 'cinematic-red');
    expect(readDharaTheme()).toBe('royal-cinematic');
  });

  it('migrates a stored champagne-luxury theme to royal-cinematic', () => {
    localStorage.setItem(DHARA_THEME_STORAGE_KEY, 'champagne-luxury');
    expect(readDharaTheme()).toBe('royal-cinematic');
    expect(bootstrapDharaTheme()).toBe('royal-cinematic');
    expect(localStorage.getItem(DHARA_THEME_STORAGE_KEY)).toBe('royal-cinematic');
    expect(document.documentElement.getAttribute('data-dhara-theme')).toBe('royal-cinematic');
  });

  it('applies a theme live without navigating away', () => {
    const href = window.location.href;
    applyDharaTheme('sapphire-luxury');
    expect(document.documentElement.getAttribute('data-dhara-theme')).toBe('sapphire-luxury');
    expect(document.body.getAttribute('data-dhara-theme')).toBe('sapphire-luxury');
    expect(window.location.href).toBe(href);
  });

  it('applies Black & White live and persists it', () => {
    applyDharaTheme('black-and-white');
    expect(document.documentElement.getAttribute('data-dhara-theme')).toBe('black-and-white');
    expect(document.body.getAttribute('data-dhara-theme')).toBe('black-and-white');
    expect(localStorage.getItem(DHARA_THEME_STORAGE_KEY)).toBe('black-and-white');
  });

  it('applies Royal Ivory live and persists it', () => {
    applyDharaTheme('royal-ivory');
    expect(document.documentElement.getAttribute('data-dhara-theme')).toBe('royal-ivory');
    expect(document.body.getAttribute('data-dhara-theme')).toBe('royal-ivory');
    expect(localStorage.getItem(DHARA_THEME_STORAGE_KEY)).toBe('royal-ivory');
  });

  it('applies Midnight Dark live and persists it without changing the default', () => {
    applyDharaTheme('midnight-dark');
    expect(document.documentElement.getAttribute('data-dhara-theme')).toBe('midnight-dark');
    expect(localStorage.getItem(DHARA_THEME_STORAGE_KEY)).toBe('midnight-dark');
    expect(DEFAULT_DHARA_THEME).toBe('royal-cinematic');
  });

  it('paints a visual theme without changing the saved selection', () => {
    localStorage.setItem(DHARA_THEME_STORAGE_KEY, 'futuristic-cyan');
    paintDharaTheme('royal-cinematic');
    expect(document.documentElement.getAttribute('data-dhara-theme')).toBe('royal-cinematic');
    expect(localStorage.getItem(DHARA_THEME_STORAGE_KEY)).toBe('futuristic-cyan');
  });
});
