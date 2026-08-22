import { useEffect, useRef, useState } from 'react';

function prefersReducedMotion() {
  return Boolean(
    typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
}

function canAnimate() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    !prefersReducedMotion()
  );
}

export function StaffCountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(0);
  const animated = useRef(false);

  useEffect(() => {
    if (!Number.isFinite(value)) return;

    if (animated.current || !canAnimate()) {
      setShown(value);
      return;
    }

    animated.current = true;
    const start = performance.now();
    const duration = 820;
    let frame = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      if (t >= 1) {
        setShown(value);
        return;
      }
      setShown(value * eased);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  const display = shown === value ? value : Math.round(shown);
  return <>{display.toLocaleString('en-IN')}</>;
}
