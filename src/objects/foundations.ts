import RAPIER from '@dimforge/rapier3d-compat';
import {
  BoxGeometry,
  BufferAttribute,
  Vector2,
  Vector3,
} from 'three';
import Instances, { Instance } from '../core/instances';
import { ConcreteMaterial } from '../core/materials';
import Physics from '../core/physics';

export class Foundation extends Instance {
  
}

class Foundations extends Instances<Foundation> {
  private static collider: RAPIER.ColliderDesc | undefined;
  static getCollider() {
    if (!Foundations.collider) {
      Foundations.collider = RAPIER.ColliderDesc.cuboid(2, 0.5, 2);
    }
    return Foundations.collider;
  }

  private static geometry: BoxGeometry | undefined;
  static getGeometry() {
    if (!Foundations.geometry) {
      Foundations.geometry = new BoxGeometry(4, 1, 4);
      Foundations.geometry.computeBoundingSphere();
      const aux = new Vector2();
      const index = Foundations.geometry.getIndex()!;
      const set = new Set();
      const uv = Foundations.geometry.getAttribute('uv') as BufferAttribute;
      Foundations.geometry.groups.forEach(({ start, count }, group) => {
        if ([0, 1, 4, 5].includes(group)) {
          for (let i = start; i < start + count; i++) {
            const v = index.getX(i);
            if (!set.has(v)) {
              set.add(v);
              aux.fromBufferAttribute(uv, v);
              uv.setXY(v, aux.x, aux.y / 4);
            }
          }
        }
      });
    }
    return Foundations.geometry;
  }

  static getMaterial() {
    return ConcreteMaterial;
  }

  constructor(physics: Physics) {
    super(
      {
        collider: Foundations.getCollider(),
        geometry: Foundations.getGeometry(),
        material: Foundations.getMaterial(),
      },
      physics
    );
  }
  
  create(position: Vector3, rotation: number, withCost: boolean = true) {
    return super.addInstance(
      new Foundation(position, rotation),
      withCost
    );
  }
}

export default Foundations;
