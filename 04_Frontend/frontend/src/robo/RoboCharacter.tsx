import { cn } from '@/utils/cn';
import type { RoboState } from './robo-states';

const ROBO_SRC = '/robo/robo-character.png';

export function RoboCharacter({
  state,
  size = 'md',
}: {
  state: RoboState;
  size?: 'sm' | 'md';
}) {
  return (
    <div
      className={cn('robo-character', `is-${state}`, size === 'sm' && 'h-16 w-12')}
      data-robo-state={state}
      aria-hidden
    >
      <img src={ROBO_SRC} alt="" />
      <span className="robo-lids" />
    </div>
  );
}
