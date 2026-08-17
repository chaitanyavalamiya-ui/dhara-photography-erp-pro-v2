import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useRobo } from './RoboProvider';
import { RoboCharacter } from './RoboCharacter';
import { RoboChatPanel } from './RoboChatPanel';
import { cn } from '@/utils/cn';
import {
  chatSideForPoint,
  clampRoboPoint,
  computeEyeLook,
  distanceBetween,
  eyeOverrideForState,
  lerp,
  namedRoboPoint,
  prefersReducedMotion,
  readStoredRoboPoint,
  roboCharacterSize,
  ROBO_EYE_IDLE_MS,
  ROBO_EYE_LERP,
  shouldStartDrag,
  writeStoredRoboPoint,
  type RoboPoint,
} from './robo-interaction';
import { DEFAULT_ROBO_POSITION } from './robo-positions';
import type { RoboLocomotion } from './robo-3d-motion';
import {
  facingToward,
  parkPointForElement,
  queryRoboTarget,
  ROBO_WALK_SPEED_PX,
  travelStep,
} from './robo-navigation';
import { resolveRoboLife } from './robo-life';
import { Mic, RotateCcw, Volume2, VolumeX } from 'lucide-react';
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

function viewport() {
  return {
    width: typeof window === 'undefined' ? 1280 : window.innerWidth,
    height: typeof window === 'undefined' ? 800 : window.innerHeight,
  };
}

export function RoboOverlay() {
  const robo = useRobo();
  const overlayRef = useRef<HTMLDivElement>(null);
  const pointRef = useRef<RoboPoint>({ x: 0, y: 0 });
  const eyeCurrent = useRef<RoboPoint>({ x: 0, y: 0 });
  const eyeTarget = useRef<RoboPoint>({ x: 0, y: 0 });
  const lastCursorMove = useRef(0);
  const skipClickRef = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origin: RoboPoint;
    dragging: boolean;
  } | null>(null);
  const [size, setSize] = useState(() => {
    const view = viewport();
    return roboCharacterSize(view.width, view.height);
  });
  const [chatSide, setChatSide] = useState<'left' | 'right'>('left');
  const [inspect, setInspect] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [locomotion, setLocomotion] = useState<RoboLocomotion>('idle');

  const applyPoint = (next: RoboPoint, persist: boolean) => {
    const view = viewport();
    const clamped = clampRoboPoint(next, size, view.width, view.height);
    pointRef.current = clamped;
    const node = overlayRef.current;
    if (node) {
      node.style.left = `${clamped.x}px`;
      node.style.top = `${clamped.y}px`;
    }
    setChatSide(chatSideForPoint(clamped, size, view.width));
    if (persist) writeStoredRoboPoint(clamped);
  };

  useEffect(() => {
    const view = viewport();
    const nextSize = roboCharacterSize(view.width, view.height);
    setSize(nextSize);
    const stored = readStoredRoboPoint();
    const initial = stored ?? namedRoboPoint(DEFAULT_ROBO_POSITION, nextSize, view.width, view.height);
    const clamped = clampRoboPoint(initial, nextSize, view.width, view.height);
    pointRef.current = clamped;
    const node = overlayRef.current;
    if (node) {
      node.style.left = `${clamped.x}px`;
      node.style.top = `${clamped.y}px`;
    }
    setChatSide(chatSideForPoint(clamped, nextSize, view.width));
  }, []);

  useEffect(() => {
    const destinationId = robo.navigationTarget || (robo.isGuiding ? robo.highlightTarget : null);
    if (!destinationId) {
      setLocomotion('idle');
      return;
    }
    const view = viewport();
    const snapTo = () => {
      const el = queryRoboTarget(destinationId);
      if (el) {
        const box = el.getBoundingClientRect();
        applyPoint(parkPointForElement(box, size, view.width, view.height), false);
        return;
      }
      applyPoint(namedRoboPoint(robo.position, size, view.width, view.height), false);
    };
    if (inspect || prefersReducedMotion()) {
      snapTo();
      setLocomotion('idle');
      if (robo.navigationTarget) robo.onArrived();
      return;
    }
    setLocomotion('walk');
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.048, (now - last) / 1000);
      last = now;
      const el = queryRoboTarget(destinationId);
      const nextView = viewport();
      let targetPoint = namedRoboPoint(robo.position, size, nextView.width, nextView.height);
      let faceAt = { x: targetPoint.x, y: targetPoint.y };
      if (el) {
        const box = el.getBoundingClientRect();
        targetPoint = parkPointForElement(box, size, nextView.width, nextView.height);
        faceAt = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
      }
      const next = travelStep(pointRef.current, targetPoint, ROBO_WALK_SPEED_PX, dt);
      applyPoint(next, false);
      overlayRef.current?.style.setProperty('--robo-face', facingToward(next, faceAt, size).toFixed(3));
      if (distanceBetween(next, targetPoint) < 4) {
        applyPoint(targetPoint, false);
        setLocomotion('idle');
        if (robo.navigationTarget) robo.onArrived();
        return;
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [robo.isGuiding, robo.position, robo.highlightTarget, robo.navigationTarget, size, inspect]);

  useEffect(() => {
    const onResize = () => {
      const view = viewport();
      const nextSize = roboCharacterSize(view.width, view.height);
      setSize(nextSize);
      const clamped = clampRoboPoint(pointRef.current, nextSize, view.width, view.height);
      pointRef.current = clamped;
      const node = overlayRef.current;
      if (node) {
        node.style.left = `${clamped.x}px`;
        node.style.top = `${clamped.y}px`;
        node.style.width = `${nextSize.width}px`;
        node.style.height = `${nextSize.height}px`;
      }
      setChatSide(chatSideForPoint(clamped, nextSize, view.width));
      writeStoredRoboPoint(clamped);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    let frame = 0;
    const tick = (now: number) => {
      const reduced = prefersReducedMotion();
      const override = eyeOverrideForState(robo.state);
      if (reduced) {
        eyeTarget.current = { x: 0, y: 0 };
      } else if (override) {
        eyeTarget.current = override;
      } else if (now - lastCursorMove.current > ROBO_EYE_IDLE_MS) {
        eyeTarget.current = {
          x: lerp(eyeTarget.current.x, 0, 0.04),
          y: lerp(eyeTarget.current.y, 0, 0.04),
        };
      }
      const amount = reduced ? 1 : ROBO_EYE_LERP;
      eyeCurrent.current = {
        x: lerp(eyeCurrent.current.x, eyeTarget.current.x, amount),
        y: lerp(eyeCurrent.current.y, eyeTarget.current.y, amount),
      };
      const node = overlayRef.current;
      if (node) {
        const x = Number.isFinite(eyeCurrent.current.x) ? eyeCurrent.current.x : 0;
        const y = Number.isFinite(eyeCurrent.current.y) ? eyeCurrent.current.y : 0;
        node.style.setProperty('--robo-eye-x', x.toFixed(3));
        node.style.setProperty('--robo-eye-y', y.toFixed(3));
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [robo.state]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      lastCursorMove.current = performance.now();
      const node = overlayRef.current;
      if (!node || prefersReducedMotion()) return;
      const override = eyeOverrideForState(robo.state);
      if (override) return;
      if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
      const visor = node.querySelector('.robo-eye-stage');
      const box = (visor ?? node).getBoundingClientRect();
      eyeTarget.current = computeEyeLook(
        { x: event.clientX, y: event.clientY },
        { x: box.left + box.width / 2, y: box.top + box.height / 2 },
      );
    };
    document.addEventListener('pointermove', onMove);
    return () => document.removeEventListener('pointermove', onMove);
  }, [robo.state]);

  if (!robo.visible) return null;

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (robo.isGuiding || inspect) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // jsdom may not implement pointer capture
    }
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: { ...pointRef.current },
      dragging: false,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || robo.isGuiding || inspect) return;
    const samePointer = event.pointerId === 0 || event.pointerId == null || event.pointerId === drag.pointerId;
    if (!samePointer) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.dragging && !shouldStartDrag(dx, dy)) return;
    if (!drag.dragging && robo.navigationTarget) robo.stopMovement();
    drag.dragging = true;
    overlayRef.current?.classList.add('is-dragging');
    applyPoint({ x: drag.origin.x + dx, y: drag.origin.y + dy }, false);
  };

  const endDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    overlayRef.current?.classList.remove('is-dragging');
    if (drag.dragging) {
      skipClickRef.current = true;
      applyPoint(pointRef.current, true);
    }
    dragRef.current = null;
  };

  const onCharacterClick = () => {
    if (inspect) return;
    if (skipClickRef.current) {
      skipClickRef.current = false;
      return;
    }
    robo.openChat();
  };

  const life = resolveRoboLife({
    visible: true,
    inspect,
    listening: robo.listening,
    speaking: robo.speaking,
    loading: robo.loading,
    locomotion,
    state: robo.state,
  });

  return (
    <>
      <RoboHighlight />
      <div
        ref={overlayRef}
        className={cn(
          'robo-overlay',
          `is-${robo.position}`,
          `is-chat-${chatSide}`,
          robo.isGuiding && 'is-guiding',
          locomotion === 'walk' && 'is-walking',
          inspect && 'is-inspect',
          robo.chatOpen && 'is-chat-open',
          robo.listening && 'is-listening',
          robo.speaking && 'is-speaking',
        )}
        data-robo-slot={robo.position}
        data-robo-size={`${size.width}x${size.height}`}
        data-robo-life={life}
        style={{ width: size.width, height: size.height, left: pointRef.current.x, top: pointRef.current.y }}
      >
        <RoboChatPanel />
        <div className="robo-launcher">
          <div className="robo-inspect-bar">
            <button
              type="button"
              className="btn-secondary px-2 py-1 text-xs"
              aria-label={inspect ? 'Exit 3D view' : 'Inspect Robo in 3D'}
              onClick={() => {
                setInspect((open) => !open);
                setAutoRotate(false);
              }}
            >
              {inspect ? 'Exit 3D' : '3D View'}
            </button>
            {inspect ? (
              <>
                <button
                  type="button"
                  className="btn-secondary px-2 py-1 text-xs"
                  aria-label="Reset 3D view"
                  onClick={() => setResetKey((value) => value + 1)}
                >
                  Reset
                </button>
                <button
                  type="button"
                  className="btn-secondary px-2 py-1 text-xs"
                  aria-label={autoRotate ? 'Stop auto-rotate' : 'Auto-rotate Robo'}
                  aria-pressed={autoRotate}
                  onClick={() => setAutoRotate((value) => !value)}
                >
                  {autoRotate ? 'Stop rotate' : 'Auto-rotate'}
                </button>
              </>
            ) : null}
          </div>
          <div className="robo-voice-bar">
            {robo.voiceInputAvailable ? (
              <button
                type="button"
                className="btn-secondary px-2 py-1 text-xs"
                aria-label={robo.listening ? 'Stop listening' : 'Speak to Robo'}
                aria-pressed={robo.listening}
                onClick={() => (robo.listening ? robo.stopListening() : robo.startListening())}
              >
                <Mic className="h-3.5 w-3.5" />
              </button>
            ) : null}
            <button
              type="button"
              className="btn-secondary px-2 py-1 text-xs"
              aria-label={robo.voiceMuted ? 'Unmute Robo' : 'Mute Robo'}
              aria-pressed={robo.voiceMuted}
              onClick={robo.toggleMute}
            >
              {robo.voiceMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              className="btn-secondary px-2 py-1 text-xs"
              aria-label="Replay Robo response"
              disabled={!robo.lastSpoken || robo.voiceMuted}
              onClick={robo.replayLast}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            {robo.speaking ? (
              <button type="button" className="btn-secondary px-2 py-1 text-xs" aria-label="Stop speaking" onClick={() => void robo.stopSpeaking()}>
                Stop
              </button>
            ) : null}
          </div>
          {inspect ? (
            <div className="robo-inspect-stage" role="img" aria-label="Inspect Robo in 3D">
              <RoboCharacter
                state={robo.state}
                interactive
                locomotion="idle"
                inspect
                autoRotate={autoRotate}
                resetKey={resetKey}
              />
            </div>
          ) : (
            <button
              type="button"
              className="robo-drag-handle"
              aria-label="Open Robo AI Assistant"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onClick={onCharacterClick}
            >
              <RoboCharacter
                state={robo.state}
                interactive
                locomotion={locomotion}
                inspect={false}
                autoRotate={false}
                resetKey={0}
              />
            </button>
          )}
          <button
            type="button"
            className="btn-secondary robo-hide px-3 py-1 text-sm"
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
