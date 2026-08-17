import { afterEach, describe, expect, it, vi } from 'vitest';
import { inspectGltfJson, isWebGLAvailable, normalsNeedRepair, ROBO_GLB_SRC } from './robo-webgl';

describe('Robo WebGL fallback', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('does not crash when WebGL is unavailable', () => {
    const getContext = vi.fn(() => {
      throw new Error('no webgl');
    });
    vi.spyOn(document, 'createElement').mockReturnValue({ getContext } as unknown as HTMLCanvasElement);
    expect(isWebGLAvailable()).toBe(false);
  });

  it('reports available when a WebGL context can be created', () => {
    vi.spyOn(document, 'createElement').mockReturnValue({
      getContext: (type: string) => (type === 'webgl' ? {} : null),
    } as unknown as HTMLCanvasElement);
    expect(isWebGLAvailable()).toBe(true);
  });

  it('points the 3D canvas at the generated full-body GLB', () => {
    expect(ROBO_GLB_SRC).toBe('/models/white_mesh.glb');
  });

  it('reports that the current generated GLB is not rigged and cannot recolor parts', () => {
    expect(inspectGltfJson({ meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }], nodes: [{ name: 'world' }] })).toMatchObject({
      rigged: false,
      canRecolorParts: false,
      hasNamedEyeParts: false,
      hasUvs: false,
    });
    expect(inspectGltfJson({ skins: [{}], meshes: [{ primitives: [{ attributes: { POSITION: 0, JOINTS_0: 1 } }] }] }).rigged).toBe(
      true,
    );
  });

  it('repairs missing or zeroed normals only', () => {
    expect(normalsNeedRepair(undefined)).toBe(true);
    expect(normalsNeedRepair({ count: 0, getX: () => 0, getY: () => 0, getZ: () => 0 })).toBe(true);
    expect(
      normalsNeedRepair({
        count: 3,
        getX: () => 0,
        getY: () => 0,
        getZ: () => 0,
      }),
    ).toBe(true);
    expect(
      normalsNeedRepair({
        count: 3,
        getX: () => 0,
        getY: () => 1,
        getZ: () => 0,
      }),
    ).toBe(false);
  });
});
