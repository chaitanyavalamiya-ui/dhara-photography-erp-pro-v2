import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

class FileReaderPolyfill {
  result = null;
  onload = null;
  onloadend = null;
  onerror = null;
  readAsArrayBuffer(blob) {
    const done = (buffer) => {
      this.result = buffer;
      this.onload?.({ target: this });
      this.onloadend?.({ target: this });
    };
    if (typeof blob?.arrayBuffer === 'function') {
      void blob.arrayBuffer().then(done);
      return;
    }
    done(blob);
  }
}
globalThis.FileReader = FileReaderPolyfill;

const WHITE = new THREE.MeshPhysicalMaterial({
  color: 0xf4f6f8,
  roughness: 0.26,
  metalness: 0.02,
  clearcoat: 0.48,
  clearcoatRoughness: 0.22,
});
const ORANGE = new THREE.MeshPhysicalMaterial({
  color: 0xff6a12,
  roughness: 0.32,
  metalness: 0.04,
  clearcoat: 0.28,
  clearcoatRoughness: 0.3,
});
const DARK = new THREE.MeshStandardMaterial({
  color: 0x161b22,
  roughness: 0.58,
  metalness: 0.1,
});
const VISOR = new THREE.MeshPhysicalMaterial({
  color: 0x05070a,
  roughness: 0.06,
  metalness: 0.22,
  clearcoat: 0.82,
  clearcoatRoughness: 0.06,
});
const CYAN = new THREE.MeshStandardMaterial({
  color: 0x3defff,
  emissive: 0x1ad8ea,
  emissiveIntensity: 2.35,
  roughness: 0.28,
  metalness: 0.02,
});

function part(name, geometry, material) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function group(name) {
  const node = new THREE.Group();
  node.name = name;
  return node;
}

function grillVent(name, x, y, z) {
  const vent = group(name);
  vent.position.set(x, y, z);
  const plate = part(`${name}Plate`, new THREE.BoxGeometry(0.092, 0.036, 0.02), CYAN.clone());
  vent.add(plate);
  [-0.01, 0, 0.01].forEach((oy, index) => {
    const slot = part(`${name}Slot${index}`, new THREE.BoxGeometry(0.078, 0.004, 0.006), DARK);
    slot.position.set(0, oy, 0.012);
    vent.add(slot);
  });
  return vent;
}

function buildHand(side) {
  const prefix = side === 'right' ? 'Right' : 'Left';
  const hand = group(`Hand${prefix}`);
  const palm = part(`Palm${prefix}`, new THREE.SphereGeometry(0.052, 12, 10), DARK);
  palm.scale.set(1.22, 0.72, 0.92);
  hand.add(palm);
  [-0.042, -0.014, 0.014, 0.042].forEach((x, index) => {
    const finger = part(`Finger${prefix}${index}`, new THREE.CapsuleGeometry(0.012, 0.052, 4, 8), DARK);
    finger.position.set(x, -0.068, 0.016);
    finger.rotation.x = 0.14;
    const cap = part(`FingerCap${prefix}${index}`, new THREE.SphereGeometry(0.013, 8, 8), WHITE);
    cap.position.set(x, -0.098, 0.022);
    hand.add(finger, cap);
  });
  const thumb = part(`Thumb${prefix}`, new THREE.CapsuleGeometry(0.014, 0.038, 4, 8), DARK);
  thumb.position.set(side === 'right' ? 0.055 : -0.055, -0.008, 0.028);
  thumb.rotation.z = side === 'right' ? -0.82 : 0.82;
  hand.add(thumb);
  return hand;
}

function buildArm(side) {
  const dir = side === 'right' ? 1 : -1;
  const prefix = side === 'right' ? 'Right' : 'Left';
  const arm = group(`Arm${prefix}`);
  arm.position.set(0.355 * dir, 0.245, 0.01);

  const shoulder = part(`Shoulder${prefix}`, new THREE.SphereGeometry(0.098, 18, 14), WHITE);
  const shoulderCap = part(`ShoulderCap${prefix}`, new THREE.SphereGeometry(0.062, 14, 12), ORANGE);
  shoulderCap.position.set(0.062 * dir, 0.028, 0.012);
  arm.add(shoulder, shoulderCap);

  const upper = group(`UpperArm${prefix}`);
  const upperMesh = part(`UpperArmMesh${prefix}`, new THREE.CapsuleGeometry(0.048, 0.118, 5, 10), WHITE);
  upperMesh.position.set(0, -0.112, 0);
  upper.add(upperMesh);

  const elbow = group(`Elbow${prefix}`);
  elbow.position.set(0, -0.228, 0);
  elbow.add(part(`ElbowMesh${prefix}`, new THREE.SphereGeometry(0.038, 12, 10), DARK));

  const forearm = group(`Forearm${prefix}`);
  const forearmMesh = part(`ForearmMesh${prefix}`, new THREE.CapsuleGeometry(0.062, 0.152, 6, 12), WHITE);
  forearmMesh.position.set(0, -0.118, 0);
  const wristBand = part(`WristBand${prefix}`, new THREE.TorusGeometry(0.058, 0.012, 8, 16), ORANGE);
  wristBand.rotation.x = Math.PI / 2;
  wristBand.position.set(0, -0.188, 0);
  forearm.add(forearmMesh, wristBand);

  const wrist = group(`Wrist${prefix}`);
  wrist.position.set(0, -0.228, 0);
  wrist.add(part(`WristMesh${prefix}`, new THREE.SphereGeometry(0.032, 10, 8), DARK));

  const hand = buildHand(side);
  hand.position.set(0, -0.058, 0.01);
  wrist.add(hand);
  forearm.add(wrist);
  elbow.add(forearm);
  upper.add(elbow);
  arm.add(upper);

  if (side === 'right') {
    arm.rotation.set(-0.22, 0.42, -1.22);
    elbow.rotation.set(0.12, 0.08, -0.62);
    hand.rotation.set(0.42, 0.72, 0.18);
  } else {
    arm.rotation.set(0.1, 0.04, 0.22);
  }
  return arm;
}

function buildLeg(side) {
  const dir = side === 'right' ? 1 : -1;
  const prefix = side === 'right' ? 'Right' : 'Left';
  const leg = group(`Leg${prefix}`);
  leg.position.set(0.132 * dir, 0.012, 0);

  const thigh = group(`Thigh${prefix}`);
  const hipCap = part(`HipCap${prefix}`, new THREE.TorusGeometry(0.062, 0.015, 8, 16), ORANGE);
  hipCap.rotation.x = Math.PI / 2;
  hipCap.position.set(0, -0.012, 0);
  const thighMesh = part(`ThighMesh${prefix}`, new THREE.CapsuleGeometry(0.072, 0.128, 5, 10), WHITE);
  thighMesh.position.set(0, -0.118, 0);
  thigh.add(hipCap, thighMesh);

  const knee = group(`Knee${prefix}`);
  knee.position.set(0, -0.228, 0);
  knee.add(part(`KneeMesh${prefix}`, new THREE.SphereGeometry(0.046, 12, 10), DARK));

  const shin = group(`Shin${prefix}`);
  const shinMesh = part(`ShinMesh${prefix}`, new THREE.CapsuleGeometry(0.078, 0.158, 6, 12), WHITE);
  shinMesh.position.set(0, -0.128, 0);
  const shinGlow = part(`ShinGlow${prefix}`, new THREE.BoxGeometry(0.028, 0.072, 0.016), CYAN.clone());
  shinGlow.position.set(0, -0.132, 0.078);
  shin.add(shinMesh, shinGlow);

  const ankle = group(`Ankle${prefix}`);
  ankle.position.set(0, -0.258, 0);
  ankle.add(part(`AnkleMesh${prefix}`, new THREE.SphereGeometry(0.038, 10, 8), DARK));

  const foot = group(`Foot${prefix}`);
  foot.position.set(0, -0.042, 0.078);
  const shell = part(`FootShell${prefix}`, new THREE.SphereGeometry(0.118, 16, 12), WHITE);
  shell.scale.set(1.18, 0.56, 1.68);
  shell.position.set(0, 0.016, 0.048);
  const sole = part(`Sole${prefix}`, new THREE.SphereGeometry(0.122, 12, 10), ORANGE);
  sole.scale.set(1.26, 0.24, 1.78);
  sole.position.set(0, -0.038, 0.048);
  const heel = part(`Heel${prefix}`, new THREE.SphereGeometry(0.046, 10, 8), DARK);
  heel.position.set(0, -0.004, -0.078);
  const inset = part(`FootInset${prefix}`, new THREE.BoxGeometry(0.078, 0.028, 0.068), DARK);
  inset.position.set(0, 0.042, 0.082);
  const glow = part(`FootGlow${prefix}`, new THREE.BoxGeometry(0.058, 0.016, 0.042), CYAN.clone());
  glow.position.set(0, 0.04, 0.152);
  const toeCap = part(`ToeCap${prefix}`, new THREE.SphereGeometry(0.038, 10, 8), ORANGE);
  toeCap.scale.set(1.35, 0.45, 0.7);
  toeCap.position.set(0, 0.028, 0.168);
  foot.add(shell, sole, heel, inset, glow, toeCap);

  ankle.add(foot);
  shin.add(ankle);
  knee.add(shin);
  thigh.add(knee);
  leg.add(thigh);
  return leg;
}

function buildEye(side) {
  const prefix = side === 'right' ? 'Right' : 'Left';
  const eye = group(`Eye${prefix}`);
  eye.position.set(side === 'right' ? 0.138 : -0.138, 0.03, 0.304);
  eye.add(part(`EyeSocket${prefix}`, new THREE.SphereGeometry(0.082, 16, 12), DARK));
  const ring = part(`EyeRing${prefix}`, new THREE.TorusGeometry(0.062, 0.016, 14, 32), CYAN.clone());
  ring.position.z = 0.038;
  const core = part(`EyeCore${prefix}`, new THREE.SphereGeometry(0.028, 12, 10), CYAN.clone());
  core.position.z = 0.048;
  const lid = part(`Lid${prefix}`, new THREE.SphereGeometry(0.086, 12, 8, 0, Math.PI * 2, 0, 1.12), VISOR);
  lid.rotation.x = Math.PI;
  lid.position.set(0, 0.018, 0.01);
  lid.scale.set(1, 0.14, 1);
  eye.add(ring, core, lid);
  return eye;
}

function buildRobo() {
  const root = group('RoboRoot');
  const body = group('Body');

  const torso = part('Torso', new THREE.SphereGeometry(0.228, 28, 20), WHITE);
  torso.scale.set(1.42, 1.16, 0.92);
  torso.position.set(0, 0.11, 0);
  const chestFront = part('ChestFront', new THREE.SphereGeometry(0.168, 18, 14), WHITE);
  chestFront.position.set(0, 0.12, 0.08);
  chestFront.scale.set(1.28, 0.92, 0.55);
  body.add(torso, chestFront);
  body.add(grillVent('ChestVentLeft', -0.102, 0.205, 0.208));
  body.add(grillVent('ChestVentRight', 0.102, 0.205, 0.208));
  const belly = part('BellyMark', new THREE.CapsuleGeometry(0.01, 0.048, 4, 8), ORANGE);
  belly.position.set(0, 0.018, 0.218);
  const waist = part('WaistCore', new THREE.CylinderGeometry(0.118, 0.148, 0.078, 16), DARK);
  waist.position.set(0, -0.078, 0);
  body.add(belly, waist);

  const hip = group('Hip');
  hip.position.set(0, -0.168, 0);
  const hipShell = part('HipShell', new THREE.SphereGeometry(0.178, 18, 14), WHITE);
  hipShell.scale.set(1.32, 0.62, 0.98);
  hip.add(hipShell);
  hip.add(buildLeg('left'), buildLeg('right'));
  body.add(hip);

  const neck = group('Neck');
  neck.position.set(0, 0.318, 0);
  const neckJoint = part('NeckJoint', new THREE.CylinderGeometry(0.058, 0.078, 0.062, 14), DARK);
  neckJoint.position.set(0, -0.008, 0);
  neck.add(neckJoint);

  const head = group('Head');
  head.position.set(0, 0.248, 0);
  const headShell = part('HeadShell', new THREE.SphereGeometry(0.298, 40, 32), WHITE);
  headShell.scale.set(1.22, 1.02, 1.12);
  head.add(headShell);

  const visor = part(
    'Visor',
    new THREE.SphereGeometry(0.292, 48, 28, Math.PI / 2 - 1.28, 2.56, 0.82, 0.82),
    VISOR,
  );
  visor.scale.set(1.18, 0.82, 1.1);
  visor.position.set(0, 0.024, 0.03);
  head.add(visor);
  head.add(buildEye('left'), buildEye('right'));

  const mouth = part('Mouth', new THREE.CapsuleGeometry(0.006, 0.048, 4, 8), DARK);
  mouth.rotation.z = Math.PI / 2;
  mouth.position.set(0, -0.152, 0.318);
  head.add(mouth);

  const earLeft = part('EarLeft', new THREE.SphereGeometry(0.108, 20, 16), ORANGE);
  earLeft.scale.set(0.34, 1.12, 1.12);
  earLeft.position.set(-0.378, 0.018, 0.022);
  const earRight = part('EarRight', new THREE.SphereGeometry(0.108, 20, 16), ORANGE);
  earRight.scale.set(0.34, 1.12, 1.12);
  earRight.position.set(0.378, 0.018, 0.022);
  head.add(earLeft, earRight);

  const headGlow = part('HeadGlow', new THREE.TorusGeometry(0.162, 0.011, 8, 32, Math.PI * 1.08), CYAN.clone());
  headGlow.rotation.set(Math.PI / 2.12, 0, 0);
  headGlow.position.set(0, 0.262, 0.072);
  head.add(headGlow);

  neck.add(head);
  body.add(neck, buildArm('left'), buildArm('right'));
  root.add(body);
  return root;
}

const root = buildRobo();
root.updateMatrixWorld(true);
const box = new THREE.Box3().setFromObject(root);
const size = box.getSize(new THREE.Vector3());
const required = [
  'RoboRoot',
  'Body',
  'Hip',
  'Neck',
  'Head',
  'ArmLeft',
  'ArmRight',
  'HandLeft',
  'HandRight',
  'LegLeft',
  'LegRight',
  'FootLeft',
  'FootRight',
  'EyeLeft',
  'EyeRight',
  'Mouth',
];
const names = new Set();
let meshes = 0;
let hidden = 0;
let zeroScale = 0;
root.traverse((item) => {
  if (item.name) names.add(item.name);
  if (item.isMesh) {
    meshes += 1;
    if (!item.visible) hidden += 1;
    if (Math.abs(item.scale.x * item.scale.y * item.scale.z) < 1e-6) zeroScale += 1;
  }
});
const missing = required.filter((name) => !names.has(name));
console.log(
  JSON.stringify(
    {
      size: { x: +size.x.toFixed(3), y: +size.y.toFixed(3), z: +size.z.toFixed(3) },
      min: { x: +box.min.x.toFixed(3), y: +box.min.y.toFixed(3), z: +box.min.z.toFixed(3) },
      max: { x: +box.max.x.toFixed(3), y: +box.max.y.toFixed(3), z: +box.max.z.toFixed(3) },
      meshes,
      hidden,
      zeroScale,
      missing,
      headRatio: +((0.298 * 1.02 * 2) / size.y).toFixed(3),
    },
    null,
    2,
  ),
);
if (missing.length || hidden || zeroScale) {
  console.error('GLB validation failed');
  process.exit(1);
}

const exporter = new GLTFExporter();
const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/robo');
mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'robo-character.glb');

exporter.parse(
  root,
  (result) => {
    writeFileSync(outFile, Buffer.from(result));
    console.log(`Wrote ${outFile} (${Buffer.from(result).length} bytes)`);
  },
  (error) => {
    console.error(error);
    process.exit(1);
  },
  { binary: true },
);
