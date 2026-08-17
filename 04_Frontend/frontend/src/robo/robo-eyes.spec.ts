import { describe, expect, it } from 'vitest';
import { eyeGlowForLife, inspectEyeCapability } from './robo-eyes';

describe('robo eyes', () => {
  it('uses overlay mode when the GLB has no named eye parts', () => {
    expect(inspectEyeCapability(['world', 'tmprqxyum6x.ply'])).toEqual({ namedParts: false, overlay: true });
    expect(inspectEyeCapability(['Head', 'EyeLeft', 'EyeRight']).namedParts).toBe(true);
  });

  it('pulses more while listening or speaking', () => {
    expect(eyeGlowForLife('listening').pulse).toBeGreaterThan(eyeGlowForLife('idle').pulse);
    expect(eyeGlowForLife('speaking').color).toMatch(/#/);
  });
});
