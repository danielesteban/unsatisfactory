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

export class Wall extends Instance {

}

class Walls extends Instances<Wall> {
  private static collider: RAPIER.ColliderDesc | undefined;
  static getCollider() {
    if (!Walls.collider) {
      Walls.collider = RAPIER.ColliderDesc.cuboid(2, 2, 0.25);
    }
    return Walls.collider;
  }

  private static geometry: BoxGeometry | undefined;
  static getGeometry() {
    if (!Walls.geometry) {
      const geometry = new BoxGeometry(4, 4, 0.5);
      geometry.computeBoundingSphere();
      const aux = new Vector2();
      const index = geometry.getIndex()!;
      const set = new Set();
      const uv = geometry.getAttribute('uv') as BufferAttribute;
      geometry.groups.forEach(({ start, count }, group) => {
        if ([0, 1, 2, 3].includes(group)) {
          for (let i = start; i < start + count; i++) {
            const v = index.getX(i);
            if (!set.has(v)) {
              set.add(v);
              aux.fromBufferAttribute(uv, v);
              if ([0, 1].includes(group)) {
                uv.setXY(v, aux.x / 8, aux.y);
              } else {
                uv.setXY(v, aux.x, aux.y / 8);
              }
            }
          }
        }
      });
      Walls.geometry = geometry;
    }
    return Walls.geometry;
  }

  static getMaterial() {
    return ConcreteMaterial();
  }

  constructor(physics: Physics) {
    super(
      {
        collider: Walls.getCollider(),
        geometry: Walls.getGeometry(),
        material: Walls.getMaterial(),
      },
      physics
    );
  }

  create(position: Vector3, rotation: number, withCost: boolean = true) {
    return super.addInstance(
      new Wall(position, rotation),
      withCost
    );
  }
}

export default Walls;
