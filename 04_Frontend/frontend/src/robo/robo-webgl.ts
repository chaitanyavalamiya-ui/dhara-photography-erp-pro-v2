export const ROBO_GLB_SRC = '/models/white_mesh.glb';

export interface GltfJsonLike {
  skins?: unknown[];
  animations?: unknown[];
  materials?: unknown[];
  meshes?: Array<{ primitives?: Array<{ attributes?: Record<string, unknown>; material?: number }> }>;
  nodes?: Array<{ skin?: number; name?: string }>;
}

export interface RoboGltfCapabilities {
  rigged: boolean;
  skins: number;
  animations: number;
  materials: number;
  meshes: number;
  hasNormals: boolean;
  hasUvs: boolean;
  hasVertexColors: boolean;
  canRecolorParts: boolean;
  hasNamedEyeParts: boolean;
}

export function inspectGltfJson(json: GltfJsonLike): RoboGltfCapabilities {
  const meshes = json.meshes ?? [];
  const attrs = meshes.flatMap((mesh) => mesh.primitives ?? []).map((prim) => prim.attributes ?? {});
  const names = (json.nodes ?? []).map((node) => node.name ?? '');
  const materials = json.materials?.length ?? 0;
  const distinctPrimMaterials = new Set(
    meshes.flatMap((mesh) => mesh.primitives ?? []).map((prim) => prim.material).filter((value) => value != null),
  );
  return {
    rigged: Boolean(json.skins?.length) || (json.nodes ?? []).some((node) => node.skin != null),
    skins: json.skins?.length ?? 0,
    animations: json.animations?.length ?? 0,
    materials,
    meshes: meshes.length,
    hasNormals: attrs.some((item) => 'NORMAL' in item),
    hasUvs: attrs.some((item) => 'TEXCOORD_0' in item),
    hasVertexColors: attrs.some((item) => 'COLOR_0' in item),
    canRecolorParts: materials > 1 || distinctPrimMaterials.size > 1 || meshes.length > 1,
    hasNamedEyeParts: names.some((name) => /eye|visor|lid/i.test(name)),
  };
}

type NormalAttribute = {
  count: number;
  getX: (index: number) => number;
  getY: (index: number) => number;
  getZ: (index: number) => number;
};

export function isWebGLAvailable(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** True when normals are missing or effectively zero, so lighting would flatten/darken the mesh. */
export function normalsNeedRepair(attribute: NormalAttribute | undefined): boolean {
  if (!attribute || attribute.count === 0) return true;
  const step = Math.max(1, Math.floor(attribute.count / 24));
  for (let i = 0; i < attribute.count; i += step) {
    const x = attribute.getX(i);
    const y = attribute.getY(i);
    const z = attribute.getZ(i);
    if (x * x + y * y + z * z > 0.01) return false;
  }
  return true;
}
