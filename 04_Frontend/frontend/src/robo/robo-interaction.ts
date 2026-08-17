import type { RoboPosition } from './robo-positions';
import type { RoboState } from './robo-states';

export const ROBO_ASSET_SRC = '/robo/robo-character.png';
export const ROBO_SESSION_KEY = 'dhara-robo-xy';
export const ROBO_DRAG_THRESHOLD_PX = 8;
export const ROBO_SAFE_MARGIN_PX = 16;
export const ROBO_MIN_VISIBLE_PX = 80;
export const ROBO_ASPECT_RATIO = 293 / 367;
export const ROBO_EYE_MAX_X = 0.26;
export const ROBO_EYE_MAX_Y = 0.2;
export const ROBO_EYE_LERP = 0.16;
export const ROBO_EYE_IDLE_MS = 1400;

export interface RoboPoint {
  x: number;
  y: number;
}

export interface RoboSize {
  width: number;
  height: number;
}

export function roboCharacterSize(viewportWidth: number, viewportHeight: number): RoboSize {
  let height = 320;
  if (viewportWidth >= 1440 && viewportHeight >= 820) {
    height = 400;
  } else if (viewportWidth >= 1280) {
    height = 360;
  } else if (viewportWidth >= 1024) {
    height = 300;
  } else if (viewportWidth >= 768) {
    height = 240;
  } else {
    height = Math.min(200, Math.max(148, viewportHeight * 0.28));
  }
  height = Math.min(height, viewportHeight * 0.52);
  return {
    width: Math.round(height * ROBO_ASPECT_RATIO),
    height: Math.round(height),
  };
}

export function namedRoboPoint(
  slot: RoboPosition,
  size: RoboSize,
  viewportWidth: number,
  viewportHeight: number,
): RoboPoint {
  const margin = ROBO_SAFE_MARGIN_PX;
  switch (slot) {
    case 'bottom-left':
      return { x: margin, y: viewportHeight - size.height - margin };
    case 'top-right':
      return { x: viewportWidth - size.width - margin, y: 88 };
    case 'top-left':
      return { x: margin, y: 88 };
    case 'center-right':
      return { x: viewportWidth - size.width - margin, y: Math.round(viewportHeight * 0.42) };
    case 'center-left':
      return { x: Math.round(17.5 * 16), y: Math.round(viewportHeight * 0.42) };
    case 'bottom-right':
    default:
      return { x: viewportWidth - size.width - margin, y: viewportHeight - size.height - margin };
  }
}

export function clampRoboPoint(
  point: RoboPoint,
  size: RoboSize,
  viewportWidth: number,
  viewportHeight: number,
): RoboPoint {
  const margin = ROBO_SAFE_MARGIN_PX;
  const minVisible = ROBO_MIN_VISIBLE_PX;
  const minX = margin - size.width + minVisible;
  const maxX = viewportWidth - minVisible - margin;
  const minY = margin;
  const maxY = viewportHeight - minVisible - margin;
  return {
    x: Math.min(Math.max(point.x, minX), Math.max(minX, maxX)),
    y: Math.min(Math.max(point.y, minY), Math.max(minY, maxY)),
  };
}

export function shouldStartDrag(deltaX: number, deltaY: number, threshold = ROBO_DRAG_THRESHOLD_PX): boolean {
  return deltaX * deltaX + deltaY * deltaY >= threshold * threshold;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

export function distanceBetween(from: RoboPoint, to: RoboPoint): number {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

export function stepToward(from: RoboPoint, to: RoboPoint, amount: number): RoboPoint {
  return {
    x: lerp(from.x, to.x, amount),
    y: lerp(from.y, to.y, amount),
  };
}

export function computeEyeLook(
  cursor: RoboPoint,
  visorCenter: RoboPoint,
  maxX = ROBO_EYE_MAX_X,
  maxY = ROBO_EYE_MAX_Y,
): RoboPoint {
  const nx = (cursor.x - visorCenter.x) / 280;
  const ny = (cursor.y - visorCenter.y) / 220;
  return {
    x: clamp(nx, -maxX, maxX),
    y: clamp(ny, -maxY, maxY),
  };
}

export function eyeOverrideForState(state: RoboState): RoboPoint | null {
  if (state === 'thinking') return { x: 0, y: -0.18 };
  if (state === 'sad') return { x: 0.04, y: 0.14 };
  if (state === 'listening') return { x: 0, y: -0.06 };
  if (state === 'surprised' || state === 'celebrating') return { x: 0, y: 0 };
  return null;
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function readStoredRoboPoint(): RoboPoint | null {
  try {
    const raw = sessionStorage.getItem(ROBO_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RoboPoint;
    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredRoboPoint(point: RoboPoint): void {
  try {
    sessionStorage.setItem(ROBO_SESSION_KEY, JSON.stringify({ x: Math.round(point.x), y: Math.round(point.y) }));
  } catch {
    // session storage may be unavailable
  }
}

export function chatSideForPoint(point: RoboPoint, size: RoboSize, viewportWidth: number): 'left' | 'right' {
  return point.x + size.width / 2 > viewportWidth / 2 ? 'left' : 'right';
}
