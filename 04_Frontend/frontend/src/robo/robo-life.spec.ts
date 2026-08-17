import { describe, expect, it } from 'vitest';
import { lifeToRoboState, resolveRoboLife } from './robo-life';

describe('robo life state machine', () => {
  const base = {
    visible: true,
    inspect: false,
    listening: false,
    speaking: false,
    loading: false,
    locomotion: 'idle' as const,
    state: 'idle' as const,
  };

  it('prioritizes hidden, inspect, listening, then walking', () => {
    expect(resolveRoboLife({ ...base, visible: false })).toBe('hidden');
    expect(resolveRoboLife({ ...base, inspect: true })).toBe('inspect');
    expect(resolveRoboLife({ ...base, listening: true, state: 'greeting' })).toBe('listening');
    expect(resolveRoboLife({ ...base, locomotion: 'walk', state: 'guiding' })).toBe('walking');
  });

  it('maps talking and loading onto speaking and thinking', () => {
    expect(resolveRoboLife({ ...base, loading: true })).toBe('thinking');
    expect(resolveRoboLife({ ...base, state: 'talking' })).toBe('speaking');
    expect(resolveRoboLife({ ...base, speaking: true })).toBe('speaking');
    expect(resolveRoboLife({ ...base, state: 'happy' })).toBe('success');
    expect(resolveRoboLife({ ...base, state: 'confused' })).toBe('error');
  });

  it('round-trips life states onto existing Robo visual states', () => {
    expect(lifeToRoboState('speaking')).toBe('talking');
    expect(lifeToRoboState('walking')).toBe('walking');
    expect(lifeToRoboState('listening')).toBe('listening');
  });
});
