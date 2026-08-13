import { useEffect, useState } from 'react';
import { useRobo } from './RoboProvider';
import { RoboCharacter } from './RoboCharacter';
import { RoboChatPanel } from './RoboChatPanel';
import { cn } from '@/utils/cn';
import './robo.css';

export function RoboHighlight() {
  const { highlightTarget, nextGuideStep } = useRobo();
  const [box, setBox] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!highlightTarget) {
      setBox(null);
      return;
    }
    const el = document.querySelector(`[data-robo-target="${highlightTarget}"]`);
    setBox(el?.getBoundingClientRect() ?? null);
  }, [highlightTarget]);

  if (!box) return null;

  return (
    <button
      type="button"
      className="robo-highlight"
      aria-label="Continue Robo guide"
      onClick={nextGuideStep}
      style={{ top: box.top - 6, left: box.left - 6, width: box.width + 12, height: box.height + 12 }}
    />
  );
}

export function RoboOverlay() {
  const robo = useRobo();
  if (!robo.visible) return null;

  return (
    <>
      <RoboHighlight />
      <div className={cn('robo-overlay', `is-${robo.position}`)}>
        <RoboChatPanel />
        <div className="robo-launcher">
          <button
            type="button"
            className="rounded-full"
            aria-label="Open Robo AI Assistant"
            onClick={robo.openChat}
          >
            <RoboCharacter state={robo.state} />
          </button>
          <button
            type="button"
            className="btn-secondary px-3 py-1 text-sm"
            aria-label="Hide Robo"
            onClick={robo.hide}
          >
            Hide
          </button>
        </div>
      </div>
    </>
  );
}
