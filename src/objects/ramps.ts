import RAPIER from '@dimforge/rapier3d-compat';
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  Vector2,
  Vector3,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
import Instances, { Instance } from '../core/instances';
import Physics from '../core/physics';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/hexagonal_concrete_paving_diff_1k.webp';
import NormalMap from '../textures/hexagonal_concrete_paving_nor_gl_1k.webp';
import RoughnessMap from '../textures/hexagonal_concrete_paving_rough_1k.webp';

export class Ramp extends Instance {
  
}

class Ramps extends Instances<Ramp> {
  private static collider: RAPIER.ColliderDesc | undefined;
  static getCollider() {
    if (!Ramps.collider) {
      Ramps.collider = RAPIER.ColliderDesc.convexHull(
        Ramps.getGeometry().getAttribute('position').array as Float32Array
      )!;
    }
    return Ramps.collider;
  }

  private static geometry: BufferGeometry | undefined;
  static getGeometry() {
    if (!Ramps.geometry) {
      const aux = new Vector2();
      const csgEvaluator = new Evaluator();
      const base = new Brush(new BoxGeometry(4, 2, 4));
      const index = base.geometry.getIndex()!;
      {
        const map = new Map();
        const uv = base.geometry.getAttribute('uv') as BufferAttribute;
        base.geometry.groups.forEach(({ start, count }, group) => {
          if ([0, 1, 4, 5].includes(group)) {
            for (let i = start; i < start + count; i++) {
              const v = index.getX(i);
              if (!map.has(v)) {
                map.set(v, true);
                aux.fromBufferAttribute(uv, v);
                uv.setXY(v, aux.x, aux.y / 2);
              }
            }
          }
        });
      }
      const s = Math.sqrt(4*4+2*2)/4;
      const carving = new Brush(new BoxGeometry(4 * s, 2, 4 * s));
      {
        const map = new Map();
        const uv = carving.geometry.getAttribute('uv') as BufferAttribute;
        carving.geometry.groups.forEach(({ start, count }, group) => {
          const isSide = [0, 1, 4, 5].includes(group);
          for (let i = start; i < start + count; i++) {
            const v = index.getX(i);
            if (!map.has(v)) {
              map.set(v, true);
              aux.fromBufferAttribute(uv, v);
              if (isSide) {
                uv.setXY(v, aux.x, aux.y / 2);
              } else {
                uv.setXY(v, aux.x * s, aux.y * s);
              }
            }
          }
        });
      }
      carving.geometry.translate(0, 1, 0);
      carving.rotation.set(Math.atan2(2, 4), 0, 0);
      carving.updateMatrixWorld();
      Ramps.geometry = mergeVertices(csgEvaluator.evaluate(base, carving, SUBTRACTION).geometry);
      Ramps.geometry.computeBoundingSphere();
    }
    return Ramps.geometry;
  }

  private static material: MeshStandardMaterial | undefined;
  static getMaterial() {
    if (!Ramps.material) {
      const material = new MeshStandardMaterial({
        map: loadTexture(DiffuseMap),
        normalMap: loadTexture(NormalMap),
        roughnessMap: loadTexture(RoughnessMap),
      });
      material.map!.anisotropy = 16;
      material.map!.colorSpace = SRGBColorSpace;
      [material.map!, material.normalMap!, material.roughnessMap!].forEach((map) => {
        map.wrapS = map.wrapT = RepeatWrapping;
      });
      Ramps.material = material;
    }
    return Ramps.material;
  }

  constructor(physics: Physics) {
    super(
      {
        collider: Ramps.getCollider(),
        geometry: Ramps.getGeometry(),
        material: Ramps.getMaterial(),
      },
      physics
    );
  }

  create(position: Vector3, rotation: number) {
    return super.addInstance(new Ramp(position, rotation));
  }
}

export default Ramps;
