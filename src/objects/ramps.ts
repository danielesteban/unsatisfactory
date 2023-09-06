import RAPIER from '@dimforge/rapier3d-compat';
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
import Instances, { Instance } from '../core/instances';
import { ConcreteMaterial } from '../core/materials';
import Physics from '../core/physics';

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
      const csg = new Evaluator();
      csg.useGroups = false;
      const base = new Brush(new BoxGeometry(4, 2, 4));
      const index = base.geometry.getIndex()!;
      {
        const set = new Set();
        const uv = base.geometry.getAttribute('uv') as BufferAttribute;
        base.geometry.groups.forEach(({ start, count }, group) => {
          if ([0, 1, 4, 5].includes(group)) {
            for (let i = start; i < start + count; i++) {
              const v = index.getX(i);
              if (!set.has(v)) {
                set.add(v);
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
        const set = new Set();
        const uv = carving.geometry.getAttribute('uv') as BufferAttribute;
        carving.geometry.groups.forEach(({ start, count }, group) => {
          const isSide = [0, 1, 4, 5].includes(group);
          for (let i = start; i < start + count; i++) {
            const v = index.getX(i);
            if (!set.has(v)) {
              set.add(v);
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
      Ramps.geometry = mergeVertices(csg.evaluate(base, carving, SUBTRACTION).geometry);
      Ramps.geometry.computeBoundingSphere();
    }
    return Ramps.geometry;
  }

  static getMaterial() {
    return ConcreteMaterial();
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

  create(position: Vector3, rotation: number, withCost: boolean = true) {
    return super.addInstance(
      new Ramp(position, rotation),
      withCost
    );
  }
}

export default Ramps;
