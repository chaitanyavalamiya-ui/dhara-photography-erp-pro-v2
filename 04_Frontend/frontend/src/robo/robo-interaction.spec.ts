import { describe, expect, it } from 'vitest';
import {
  chatSideForPoint,
  clampRoboPoint,
  computeEyeLook,
  distanceBetween,
  eyeOverrideForState,
  lerp,
  namedRoboPoint,
  roboCharacterSize,
  ROBO_EYE_MAX_X,
  ROBO_EYE_MAX_Y,
  shouldStartDrag,
  stepToward,
} from './robo-interaction';

describe('robo size', () => {
  it('uses a large desktop character height', () => {
    expect(roboCharacterSize(1600, 900).height).toBe(400);
    expect(roboCharacterSize(1280, 800).height).toBe(360);
  });

  it('scales down on laptops and small screens', () => {
    expect(roboCharacterSize(1100, 720).height).toBe(300);
    expect(roboCharacterSize(800, 600).height).toBe(240);
    expect(roboCharacterSize(390, 700).height).toBeLessThan(220);
  });
});

describe('robo position', () => {
  const size = { width: 240, height: 320 };

  it('defaults to bottom-right', () => {
    expect(namedRoboPoint('bottom-right', size, 1280, 800)).toEqual({
      x: 1280 - 240 - 16,
      y: 800 - 320 - 16,
    });
  });

  it('keeps Robo inside the viewport', () => {
    const clamped = clampRoboPoint({ x: -400, y: 9000 }, size, 1280, 800);
    expect(clamped.x + size.width).toBeGreaterThanOrEqual(80);
    expect(clamped.y).toBeLessThan(800);
    expect(clamped.x).toBeGreaterThan(-size.width);
  });

  it('places chat on the opposite side of the character', () => {
    expect(chatSideForPoint({ x: 1000, y: 400 }, size, 1280)).toBe('left');
    expect(chatSideForPoint({ x: 40, y: 400 }, size, 1280)).toBe('right');
  });
});

describe('robo drag threshold', () => {
  it('ignores tiny pointer movement as a click', () => {
    expect(shouldStartDrag(3, 2)).toBe(false);
  });

  it('starts a drag after the movement threshold', () => {
    expect(shouldStartDrag(8, 0)).toBe(true);
    expect(shouldStartDrag(6, 6)).toBe(true);
  });
});

describe('robo eye tracking', () => {
  const visor = { x: 200, y: 200 };

  it('looks left, right, up, down, and diagonally', () => {
    expect(computeEyeLook({ x: 0, y: 200 }, visor).x).toBeLessThan(0);
    expect(computeEyeLook({ x: 800, y: 200 }, visor).x).toBeGreaterThan(0);
    expect(computeEyeLook({ x: 200, y: 0 }, visor).y).toBeLessThan(0);
    expect(computeEyeLook({ x: 200, y: 800 }, visor).y).toBeGreaterThan(0);
    const diagonal = computeEyeLook({ x: 800, y: 0 }, visor);
    expect(diagonal.x).toBeGreaterThan(0);
    expect(diagonal.y).toBeLessThan(0);
  });

  it('clamps eye movement inside the visor', () => {
    const far = computeEyeLook({ x: 10000, y: -10000 }, visor);
    expect(far.x).toBe(ROBO_EYE_MAX_X);
    expect(far.y).toBe(-ROBO_EYE_MAX_Y);
  });

  it('interpolates smoothly toward the cursor', () => {
    expect(lerp(0, 0.26, 0.16)).toBeCloseTo(0.0416);
    expect(lerp(0.2, 0, 0.04)).toBeLessThan(0.2);
  });

  it('overrides tracking for thinking, sad, surprised, and celebrating', () => {
    expect(eyeOverrideForState('thinking')?.y).toBeLessThan(0);
    expect(eyeOverrideForState('sad')?.y).toBeGreaterThan(0);
    expect(eyeOverrideForState('surprised')).toEqual({ x: 0, y: 0 });
    expect(eyeOverrideForState('celebrating')).toEqual({ x: 0, y: 0 });
    expect(eyeOverrideForState('idle')).toBeNull();
    expect(eyeOverrideForState('talking')).toBeNull();
  });

  it('steps toward a screen target without teleporting', () => {
    const from = { x: 1000, y: 600 };
    const to = { x: 40, y: 400 };
    const stepped = stepToward(from, to, 0.09);
    expect(distanceBetween(stepped, to)).toBeLessThan(distanceBetween(from, to));
    expect(stepped.x).toBeGreaterThan(to.x);
  });
});
