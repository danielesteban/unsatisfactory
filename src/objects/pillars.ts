import RAPIER from '@dimforge/rapier3d-compat';
import {
  BoxGeometry,
  MeshStandardMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three';
import Instances, { Instance } from '../core/instances';
import Physics from '../core/physics';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/hexagonal_concrete_paving_diff_1k.webp';
import NormalMap from '../textures/hexagonal_concrete_paving_nor_gl_1k.webp';
import RoughnessMap from '../textures/hexagonal_concrete_paving_rough_1k.webp';

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

  private static material: MeshStandardMaterial | undefined;
  static getMaterial() {
    if (!Pillars.material) {
      const material = new MeshStandardMaterial({
        map: loadTexture(DiffuseMap),
        normalMap: loadTexture(NormalMap),
        roughnessMap: loadTexture(RoughnessMap),
      });
      material.map!.anisotropy = 16;
      material.map!.colorSpace = SRGBColorSpace;
      Pillars.material = material;
    }
    return Pillars.material;
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
