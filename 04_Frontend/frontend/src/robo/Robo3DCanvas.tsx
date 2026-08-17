import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls, useGLTF } from '@react-three/drei';
import { Suspense, useLayoutEffect, useMemo } from 'react';
import {
  ACESFilmicToneMapping,
  Box3,
  Color,
  Group,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SRGBColorSpace,
  Sphere,
  Vector3,
  type PerspectiveCamera,
  type Object3D,
} from 'three';
import { normalsNeedRepair, ROBO_GLB_SRC } from './robo-webgl';
import { Robo3DRig } from './Robo3DRig';
import { roboCameraDistance, type RoboLocomotion } from './robo-3d-motion';
import type { RoboState } from './robo-states';

const ROBO_FOV = 30;
const ROBO_LOOK_AT: [number, number, number] = [0, 0, 0];
const ROBO_FRAME_MARGIN = 1.38;

function polishStudioMaterial(material: Material) {
  const mat = material as MeshStandardMaterial & { envMapIntensity?: number; clearcoat?: number };
  if (mat.map) mat.map.colorSpace = SRGBColorSpace;
  if (typeof mat.metalness === 'number' && !mat.envMap) {
    mat.metalness = Math.min(mat.metalness, 0.08);
  }
  if (typeof mat.roughness === 'number' && !mat.roughnessMap && mat.roughness > 0.85) {
    mat.roughness = 0.4;
  }
  if (typeof mat.envMapIntensity === 'number') mat.envMapIntensity = 0.35;
  if (typeof mat.clearcoat === 'number') mat.clearcoat = Math.min(mat.clearcoat, 0.22);
  mat.needsUpdate = true;
}

function cloneRoboMaterial(material: Material): Material {
  const cloned = material.clone();
  if (cloned instanceof MeshBasicMaterial) {
    return new MeshStandardMaterial({
      color: cloned.color?.clone() ?? new Color('#f4f6f8'),
      map: cloned.map,
      transparent: cloned.transparent,
      opacity: cloned.opacity,
      side: cloned.side,
      roughness: 0.4,
      metalness: 0.04,
    });
  }
  polishStudioMaterial(cloned);
  return cloned;
}

function prepareRoboScene(scene: Group) {
  const root = scene.clone(true) as Group;
  root.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) return;
    mesh.frustumCulled = true;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    if (mesh.geometry && normalsNeedRepair(mesh.geometry.getAttribute('normal'))) {
      mesh.geometry.computeVertexNormals();
    }
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((item) => cloneRoboMaterial(item));
    } else if (mesh.material) {
      mesh.material = cloneRoboMaterial(mesh.material);
    }
  });
  const box = new Box3().setFromObject(root);
  const center = box.getCenter(new Vector3());
  root.position.sub(center);
  root.updateMatrixWorld(true);
  return root;
}

function isRiggedRoot(root: Object3D): boolean {
  let rigged = false;
  root.traverse((child) => {
    if ((child as { isSkinnedMesh?: boolean }).isSkinnedMesh) rigged = true;
  });
  return rigged;
}

function RoboFramer({ root }: { root: Group }) {
  const { camera, size } = useThree();

  useLayoutEffect(() => {
    const box = new Box3().setFromObject(root);
    const sphere = box.getBoundingSphere(new Sphere());
    const extents = box.getSize(new Vector3());
    const radius = Math.max(sphere.radius, extents.y * 0.5, extents.x * 0.5, extents.z * 0.5);
    const perspective = camera as PerspectiveCamera;
    const distance = roboCameraDistance(radius, perspective.fov || ROBO_FOV, ROBO_FRAME_MARGIN);
    perspective.position.set(0, 0.02, distance);
    perspective.near = Math.max(0.08, distance / 50);
    perspective.far = Math.max(20, distance * 8);
    perspective.lookAt(...ROBO_LOOK_AT);
    perspective.updateProjectionMatrix();
  }, [camera, root, size.height, size.width]);

  return null;
}

function RoboStudioLights() {
  return (
    <>
      <hemisphereLight args={['#f7fbff', '#3a4456', 0.32]} />
      <ambientLight intensity={0.58} color="#ffffff" />
      <directionalLight position={[2.6, 4.1, 3.1]} intensity={1.08} color="#fff8f1" />
      <directionalLight position={[-2.8, 1.9, 1.8]} intensity={0.4} color="#e8f1ff" />
      <directionalLight position={[0.2, 2.4, -2.7]} intensity={0.46} color="#d9e8ff" />
      <directionalLight position={[0, 0.35, 3.6]} intensity={0.24} color="#ffffff" />
      <directionalLight position={[0.1, -1.7, 1.4]} intensity={0.16} color="#f3f6fb" />
    </>
  );
}

function RoboModel({
  state,
  locomotion,
  inspect,
}: {
  state: RoboState;
  locomotion: RoboLocomotion;
  inspect: boolean;
}) {
  const { scene } = useGLTF(ROBO_GLB_SRC);
  const root = useMemo(() => prepareRoboScene(scene as Group), [scene]);
  const rigged = useMemo(() => isRiggedRoot(root), [root]);
  const shadowY = useMemo(() => new Box3().setFromObject(root).min.y + 0.02, [root]);

  return (
    <>
      <RoboFramer root={root} />
      <Robo3DRig root={root} state={state} locomotion={locomotion} inspect={inspect} rigged={rigged}>
        <primitive object={root} />
      </Robo3DRig>
      <ContactShadows position={[0, shadowY, 0]} opacity={0.14} scale={2.5} blur={2.8} far={1.35} color="#020617" />
    </>
  );
}

export function Robo3DCanvas({
  state,
  locomotion = 'idle',
  inspect = false,
  autoRotate = false,
  resetKey = 0,
}: {
  state: RoboState;
  locomotion?: RoboLocomotion;
  inspect?: boolean;
  autoRotate?: boolean;
  resetKey?: number;
}) {
  return (
    <Canvas
      key={inspect ? `inspect-${resetKey}` : 'live'}
      className="robo-3d-canvas"
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.02, 5.4], fov: ROBO_FOV, near: 0.1, far: 40 }}
      style={{ background: 'transparent', width: '100%', height: '100%', pointerEvents: inspect ? 'auto' : 'none' }}
      onCreated={({ gl, camera }) => {
        gl.setClearColor(0x000000, 0);
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.12;
        gl.outputColorSpace = SRGBColorSpace;
        camera.lookAt(...ROBO_LOOK_AT);
      }}
    >
      <RoboStudioLights />
      <Suspense fallback={null}>
        <RoboModel state={state} locomotion={locomotion} inspect={inspect} />
      </Suspense>
      {inspect ? (
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          minDistance={2.4}
          maxDistance={8}
          minPolarAngle={0.25}
          maxPolarAngle={Math.PI - 0.35}
          autoRotate={autoRotate}
          autoRotateSpeed={1.15}
          target={ROBO_LOOK_AT}
        />
      ) : null}
    </Canvas>
  );
}

useGLTF.preload(ROBO_GLB_SRC);
