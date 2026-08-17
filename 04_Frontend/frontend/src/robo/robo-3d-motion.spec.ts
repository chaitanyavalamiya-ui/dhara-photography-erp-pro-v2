import { describe, expect, it } from 'vitest';
import {
  clampLook,
  dancePose,
  emotionFromState,
  livingIdle,
  meshIdleFloat,
  nextBlinkGap,
  roboCameraDistance,
  shouldBlink,
  walkCycle,
  wavePose,
} from './robo-3d-motion';

describe('robo 3d motion', () => {
  it('maps ERP states onto reusable emotions', () => {
    expect(emotionFromState('happy')).toBe('happy');
    expect(emotionFromState('greeting')).toBe('excited');
    expect(emotionFromState('celebrating')).toBe('celebrating');
    expect(emotionFromState('offline')).toBe('offline');
    expect(emotionFromState('alert')).toBe('surprised');
    expect(emotionFromState('idle')).toBe('neutral');
    expect(emotionFromState('wink')).toBe('wink');
    expect(emotionFromState('shy')).toBe('shy');
  });

  it('uses opposite legs and arms in the walk cycle', () => {
    const pose = walkCycle(0.2);
    expect(Math.sign(pose.thighL)).not.toBe(Math.sign(pose.thighR) || Math.sign(pose.thighL));
    expect(pose.armL).toBeCloseTo(pose.thighR * (0.35 / 0.55), 5);
    expect(pose.armR).toBeCloseTo(pose.thighL * (0.35 / 0.55), 5);
  });

  it('keeps look-at values inside a natural clamp', () => {
    expect(clampLook(2, 0.28)).toBe(0.28);
    expect(clampLook(-2, 0.22)).toBe(-0.22);
  });

  it('creates a short friendly dance and wave pose', () => {
    expect(dancePose(0.3).bounce).toBeGreaterThan(0);
    expect(wavePose(0.1).armR).toBeLessThan(0);
  });

  it('keeps idle living motion subtle', () => {
    const idle = livingIdle(1.2);
    expect(Math.abs(idle.breathe)).toBeLessThan(0.03);
    expect(Math.abs(idle.sway)).toBeLessThan(0.05);
    expect(idle.glow).toBeGreaterThan(2);
  });

  it('keeps mesh wrapper idle float premium and shake-free', () => {
    let maxY = 0;
    let maxYaw = 0;
    let maxRoll = 0;
    for (let t = 0; t < 20; t += 0.25) {
      const pose = meshIdleFloat(t);
      maxY = Math.max(maxY, Math.abs(pose.y));
      maxYaw = Math.max(maxYaw, Math.abs(pose.yaw));
      maxRoll = Math.max(maxRoll, Math.abs(pose.roll));
    }
    expect(maxY).toBeGreaterThan(0.02);
    expect(maxY).toBeLessThan(0.05);
    expect(maxYaw).toBeLessThan(0.05);
    expect(maxRoll).toBeLessThan(0.025);
    expect(Math.abs(meshIdleFloat(0).y)).not.toBe(Math.abs(meshIdleFloat(1.1).y));
  });

  it('spaces blinks a few seconds apart', () => {
    expect(shouldBlink(5000, 0, 2800)).toBe(true);
    expect(shouldBlink(1000, 0, 2800)).toBe(false);
    expect(nextBlinkGap(() => 0)).toBe(2800);
    expect(nextBlinkGap(() => 1)).toBe(6000);
  });

  it('frames the full model with a modest camera margin', () => {
    const tight = roboCameraDistance(1, 30, 1);
    const padded = roboCameraDistance(1, 30, 1.28);
    expect(padded).toBeGreaterThan(tight);
    expect(padded).toBeGreaterThan(4);
  });
});
