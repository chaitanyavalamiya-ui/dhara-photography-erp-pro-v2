import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type ReactNode } from 'react';
import type { Group, Object3D } from 'three';
import type { RoboState } from './robo-states';
import {
  dancePose,
  emotionFromState,
  livingIdle,
  meshIdleFloat,
  walkCycle,
  wavePose,
  clampLook,
  nextBlinkGap,
  shouldBlink,
  type RoboLocomotion,
} from './robo-3d-motion';
import { prefersReducedMotion } from './robo-interaction';

function node(root: Object3D, name: string): Object3D | undefined {
  return root.getObjectByName(name);
}

export function Robo3DRig({
  root,
  state,
  locomotion,
  inspect,
  rigged = false,
  children,
}: {
  root: Group;
  state: RoboState;
  locomotion: RoboLocomotion;
  inspect: boolean;
  rigged?: boolean;
  children?: ReactNode;
}) {
  const floatRef = useRef<Group>(null);
  const rest = useMemo(() => {
    const snapshot = new Map<string, { rx: number; ry: number; rz: number; y: number }>();
    root.traverse((item) => {
      snapshot.set(item.name, {
        rx: item.rotation.x,
        ry: item.rotation.y,
        rz: item.rotation.z,
        y: item.position.y,
      });
      const mesh = item as { isMesh?: boolean; material?: { clone?: () => unknown; emissiveIntensity?: number } };
      if (mesh.isMesh && mesh.material && typeof mesh.material.clone === 'function' && mesh.material.emissiveIntensity != null) {
        mesh.material = mesh.material.clone() as typeof mesh.material;
      }
    });
    return snapshot;
  }, [root]);
  const blink = useRef({ last: 0, gap: nextBlinkGap(), amount: 0, double: false });
  const look = useRef({ x: 0, y: 0, hx: 0, hy: 0, bx: 0 });
  const accent = useRef({ hover: 0, chat: 0 });

  useFrame((frame, delta) => {
    const time = frame.clock.elapsedTime;
    const reduced = prefersReducedMotion();
    const overlay = frame.gl.domElement.closest('.robo-overlay') as HTMLElement | null;
    const targetX = Number(overlay?.style.getPropertyValue('--robo-eye-x') || 0) || 0;
    const targetY = Number(overlay?.style.getPropertyValue('--robo-eye-y') || 0) || 0;
    const emotion = emotionFromState(state);
    const walking = locomotion === 'walk' && !reduced && !inspect;
    const boneWalk = walking && rigged;
    const dancing = (state === 'celebrating' || emotion === 'celebrating') && !reduced && !inspect;
    const waving = state === 'greeting' && !reduced && !inspect;

    look.current.x += (clampLook(targetX, 0.28) - look.current.x) * (reduced ? 1 : 0.22);
    look.current.y += (clampLook(targetY, 0.22) - look.current.y) * (reduced ? 1 : 0.22);
    look.current.hx += (look.current.x * 0.7 - look.current.hx) * (reduced ? 1 : 0.08);
    look.current.hy += (look.current.y * 0.5 - look.current.hy) * (reduced ? 1 : 0.08);
    look.current.bx += (look.current.x * 0.12 - look.current.bx) * (reduced ? 1 : 0.04);

    if (shouldBlink(time * 1000, blink.current.last, blink.current.gap) && !reduced) {
      blink.current.last = time * 1000;
      blink.current.gap = nextBlinkGap();
      blink.current.amount = 1;
      blink.current.double = Math.random() < 0.18;
    }
    blink.current.amount = Math.max(0, blink.current.amount - delta * 7);
    if (blink.current.double && blink.current.amount <= 0.05) {
      blink.current.amount = 1;
      blink.current.double = false;
    }

    const body = node(root, 'Body');
    const head = node(root, 'Head');
    const neck = node(root, 'Neck');
    const eyeL = node(root, 'EyeLeft');
    const eyeR = node(root, 'EyeRight');
    const lidL = node(root, 'LidLeft');
    const lidR = node(root, 'LidRight');
    const thighL = node(root, 'ThighLeft');
    const thighR = node(root, 'ThighRight');
    const shinL = node(root, 'ShinLeft');
    const shinR = node(root, 'ShinRight');
    const armL = node(root, 'ArmLeft');
    const armR = node(root, 'ArmRight');
    const hip = node(root, 'Hip');

    const glowParts = [
      'EyeRingLeft',
      'EyeRingRight',
      'EyeCoreLeft',
      'EyeCoreRight',
      'ChestVentLeftPlate',
      'ChestVentRightPlate',
      'HeadGlow',
      'ShinGlowLeft',
      'ShinGlowRight',
      'FootGlowLeft',
      'FootGlowRight',
    ];
    const idle = reduced || inspect ? { breathe: 0, sway: 0, headBob: 0, headTilt: 0, wave: 0, glow: 2.4 } : livingIdle(time);
    const hoverTarget = !reduced && !inspect && overlay?.matches(':hover') ? 1 : 0;
    const chatTarget = !reduced && !inspect && overlay?.classList.contains('is-chat-open') ? 1 : 0;
    accent.current.hover += (hoverTarget - accent.current.hover) * (reduced ? 1 : 0.08);
    accent.current.chat += (chatTarget - accent.current.chat) * (reduced ? 1 : 0.06);
    const floater = floatRef.current;
    if (floater) {
      if (reduced || inspect) {
        floater.position.set(0, 0, 0);
        floater.rotation.set(0, 0, 0);
      } else {
        const walk = boneWalk ? walkCycle(time) : { bounce: walking ? Math.abs(Math.sin(time * 4.6)) * 0.01 : 0, thighL: 0 };
        const dance = dancing ? dancePose(time) : { bounce: 0, sway: 0 };
        const float = meshIdleFloat(time);
        const hover = accent.current.hover;
        const chat = accent.current.chat;
        const face = Number(overlay?.style.getPropertyValue('--robo-face') || 0) || 0;
        floater.position.x = float.x;
        floater.position.y =
          float.y + walk.bounce + dance.bounce * 0.35 + hover * 0.018 + chat * (0.008 + Math.sin(time * 1.05) * 0.01);
        floater.rotation.x = float.pitch;
        floater.rotation.y = float.yaw + dance.sway * 0.25 + hover * 0.016 + chat * Math.sin(time * 0.72) * 0.02 + face;
        floater.rotation.z = float.roll;
      }
    }

    const bodyRest = rest.get('Body');
    const headRest = rest.get('Head');
    const armLRest = rest.get('ArmLeft');
    const armRRest = rest.get('ArmRight');
    const thighLRest = rest.get('ThighLeft');
    const thighRRest = rest.get('ThighRight');
    const shinLRest = rest.get('ShinLeft');
    const shinRRest = rest.get('ShinRight');

    let extraHeadX = idle.headBob;
    let extraHeadZ = idle.headTilt;
    let extraBodyY = 0;
    let eyeScale = 1;
    if (emotion === 'sad') extraHeadX = 0.22;
    if (emotion === 'thinking') extraHeadX = -0.18;
    if (emotion === 'confused') extraHeadZ = 0.28;
    if (emotion === 'happy' || emotion === 'excited') extraBodyY = Math.abs(Math.sin(time * 4)) * 0.02;
    if (emotion === 'surprised') eyeScale = 1.18;
    if (emotion === 'angry') eyeScale = 0.86;
    if (emotion === 'wink') extraHeadZ = 0.08;
    if (emotion === 'shy') {
      extraHeadX = 0.12;
      extraHeadZ = 0.22;
    }
    if (emotion === 'offline' || emotion === 'sleepy') extraHeadX = 0.16;

    if (body && bodyRest) {
      body.position.y = bodyRest.y + idle.breathe + extraBodyY;
      body.rotation.y = look.current.bx + idle.sway * 0.2;
      body.rotation.z = idle.sway * 0.35;
    }
    if (head && headRest) {
      const talk = state === 'talking' && !reduced && !inspect ? Math.sin(time * 7.5) * 0.035 : 0;
      head.rotation.y = look.current.hx + idle.sway;
      head.rotation.x = -look.current.hy + extraHeadX + talk;
      head.rotation.z = extraHeadZ;
    }
    if (neck) neck.rotation.y = look.current.hx * 0.35;
    if (eyeL) {
      eyeL.rotation.y = look.current.x * 0.9;
      eyeL.rotation.x = -look.current.y * 0.7;
      eyeL.scale.setScalar(eyeScale);
    }
    if (eyeR) {
      eyeR.rotation.y = look.current.x * 0.9;
      eyeR.rotation.x = -look.current.y * 0.7;
      eyeR.scale.setScalar(eyeScale);
    }
    const lidOpen = 0.16;
    const lidClosed = 1;
    const lidY = reduced ? lidOpen : lidOpen + (lidClosed - lidOpen) * blink.current.amount;
    if (lidL) lidL.scale.y = emotion === 'wink' ? lidClosed : lidY;
    if (lidR) lidR.scale.y = lidY;

    for (const name of glowParts) {
      const mesh = node(root, name) as { material?: { emissiveIntensity?: number } } | undefined;
      if (mesh?.material && typeof mesh.material.emissiveIntensity === 'number') {
        mesh.material.emissiveIntensity = emotion === 'offline' ? 0.35 : idle.glow;
      }
    }

    if (boneWalk) {
      const cycle = walkCycle(time);
      if (thighL && thighLRest) thighL.rotation.x = thighLRest.rx + cycle.thighL;
      if (thighR && thighRRest) thighR.rotation.x = thighRRest.rx + cycle.thighR;
      if (shinL && shinLRest) shinL.rotation.x = shinLRest.rx + cycle.shinL;
      if (shinR && shinRRest) shinR.rotation.x = shinRRest.rx + cycle.shinR;
      if (armL && armLRest) armL.rotation.x = armLRest.rx + cycle.armL;
      if (armR && armRRest) armR.rotation.x = armRRest.rx + cycle.armR;
      if (hip) hip.position.y = cycle.bounce;
    } else if (dancing) {
      const pose = dancePose(time);
      if (body && bodyRest) body.position.y = bodyRest.y + pose.bounce;
      if (armL && armLRest) armL.rotation.z = armLRest.rz + pose.armL;
      if (armR && armRRest) armR.rotation.z = armRRest.rz + pose.armR;
      if (head && headRest) head.rotation.z = pose.head;
      if (hip) hip.position.x = pose.sway * 0.08;
    } else if (waving) {
      const pose = wavePose(time);
      if (armR && armRRest) armR.rotation.z = pose.armR;
      if (head && headRest) head.rotation.z = pose.head;
    } else {
      if (thighL && thighLRest) thighL.rotation.x = thighLRest.rx;
      if (thighR && thighRRest) thighR.rotation.x = thighRRest.rx;
      if (shinL && shinLRest) shinL.rotation.x = shinLRest.rx;
      if (shinR && shinRRest) shinR.rotation.x = shinRRest.rx;
      if (armL && armLRest) {
        armL.rotation.x = armLRest.rx;
        armL.rotation.z = armLRest.rz;
      }
      if (armR && armRRest) {
        armR.rotation.x = armRRest.rx;
        armR.rotation.z = armRRest.rz + idle.wave;
      }
      if (hip) {
        hip.position.y = 0;
        hip.position.x = 0;
      }
    }
  });

  return <group ref={floatRef}>{children}</group>;
}
