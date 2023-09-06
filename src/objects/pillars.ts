import RAPIER from '@dimforge/rapier3d-compat';
import {
  BoxGeometry,
  Vector3,
} from 'three';
import Instances, { Instance } from '../core/instances';
import { ConcreteMaterial } from '../core/materials';
import Physics from '../core/physics';

export class Pillar extends Instance {
  
}

class Pillars extends Instances<Pillar> {
  private static collider: RAPIER.ColliderDesc | undefined;
  static getCollider() {
    if (!Pillars.collider) {
      Pillars.collider = RAPIER.ColliderDesc.cuboid(2, 2, 2);
    }
    return Pillars.collider;
  }

  private static geometry: BoxGeometry | undefined;
  static getGeometry() {
    if (!Pillars.geometry) {
      Pillars.geometry = new BoxGeometry(4, 4, 4);
      Pillars.geometry.computeBoundingSphere();
    }
    return Pillars.geometry;
  }

  static getMaterial() {
    return ConcreteMaterial;
  }

  constructor(physics: Physics) {
    super(
      {
        collider: Pillars.getCollider(),
        geometry: Pillars.getGeometry(),
        material: Pillars.getMaterial(),
      },
      physics
    );
  }
  
  create(position: Vector3, rotation: number, withCost: boolean = true) {
    return super.addInstance(
      new Pillar(position, rotation),
      withCost
    );
  }
}

export default Pillars;
