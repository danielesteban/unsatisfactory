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

export class Column extends Instance {
  
}

class Columns extends Instances<Column> {
  private static collider: RAPIER.ColliderDesc | undefined;
  static getCollider() {
    if (!Columns.collider) {
      Columns.collider = RAPIER.ColliderDesc.cuboid(0.5, 2, 0.5);
    }
    return Columns.collider;
  }

  private static geometry: BoxGeometry | undefined;
  static getGeometry() {
    if (!Columns.geometry) {
      const geometry = new BoxGeometry(1, 4, 1);
      geometry.computeBoundingSphere();
      const aux = new Vector2();
      const index = geometry.getIndex()!;
      const set = new Set();
      const uv = geometry.getAttribute('uv') as BufferAttribute;
      geometry.groups.forEach(({ start, count }, group) => {
        for (let i = start; i < start + count; i++) {
          const v = index.getX(i);
          if (!set.has(v)) {
            set.add(v);
            aux.fromBufferAttribute(uv, v);
            if ([0, 1].includes(group)) {
              uv.setXY(v, aux.x / 4, aux.y);
            } else if ([4, 5].includes(group)) {
              uv.setXY(v, aux.x / 4, aux.y);
            } else {
              uv.setXY(v, aux.x / 4, aux.y / 4);
            }
          }
        }
      });
      Columns.geometry = geometry;
    }
    return Columns.geometry;
  }

  static getMaterial() {
    return ConcreteMaterial;
  }

  constructor(physics: Physics) {
    super(
      {
        collider: Columns.getCollider(),
        geometry: Columns.getGeometry(),
        material: Columns.getMaterial(),
      },
      physics
    );
  }

  create(position: Vector3, rotation: number, withCost: boolean = true) {
    return super.addInstance(
      new Column(position, rotation),
      withCost
    );
  }
}

export default Columns;
