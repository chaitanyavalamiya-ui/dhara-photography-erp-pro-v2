import { lazy, Suspense, useEffect, useState } from 'react';
import { cn } from '@/utils/cn';
import type { RoboState } from './robo-states';
import { isWebGLAvailable } from './robo-webgl';
import { Robo3DErrorBoundary } from './Robo3DErrorBoundary';
import { RoboFallbackImage } from './RoboFallbackImage';
import type { RoboLocomotion } from './robo-3d-motion';

const Robo3DCanvas = lazy(async () => {
  const module = await import('./Robo3DCanvas');
  return { default: module.Robo3DCanvas };
});

export function RoboCharacter({
  state,
  size = 'md',
  interactive = false,
  locomotion = 'idle',
  inspect = false,
  autoRotate = false,
  resetKey = 0,
}: {
  state: RoboState;
  size?: 'sm' | 'md';
  interactive?: boolean;
  locomotion?: RoboLocomotion;
  inspect?: boolean;
  autoRotate?: boolean;
  resetKey?: number;
}) {
  const use3d = interactive && size !== 'sm';
  const [webgl, setWebgl] = useState(false);

  useEffect(() => {
    setWebgl(isWebGLAvailable());
  }, []);

  const visual = use3d && webgl ? '3d' : '2d';

  return (
    <div
      className={cn('robo-character', size === 'sm' && 'is-sm', inspect && 'is-inspect')}
      data-robo-state={state}
      data-robo-asset="cutout"
      data-robo-visual={visual}
      data-robo-locomotion={locomotion}
      aria-hidden
    >
      <div className={cn('robo-character-motion', `is-${state}`)}>
        {visual === '3d' ? (
          <Robo3DErrorBoundary>
            <Suspense fallback={<RoboFallbackImage />}>
              <Robo3DCanvas
                state={state}
                locomotion={locomotion}
                inspect={inspect}
                autoRotate={autoRotate}
                resetKey={resetKey}
              />
            </Suspense>
          </Robo3DErrorBoundary>
        ) : (
          <RoboFallbackImage showEyes={interactive && size !== 'sm'} />
        )}
      </div>
    </div>
  );
}
