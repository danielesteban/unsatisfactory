import RAPIER from '@dimforge/rapier3d-compat';
import {
  BoxGeometry,
  BufferAttribute,
  MeshStandardMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
} from 'three';
import Instances, { Instance } from '../core/instances';
import Physics from '../core/physics';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/hexagonal_concrete_paving_diff_1k.webp';
import NormalMap from '../textures/hexagonal_concrete_paving_nor_gl_1k.webp';
import RoughnessMap from '../textures/hexagonal_concrete_paving_rough_1k.webp';

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

  private static material: MeshStandardMaterial | undefined;
  static getMaterial() {
    if (!Walls.material) {
      const material = new MeshStandardMaterial({
        map: loadTexture(DiffuseMap),
        normalMap: loadTexture(NormalMap),
        roughnessMap: loadTexture(RoughnessMap),
      });
      material.map!.anisotropy = 16;
      material.map!.colorSpace = SRGBColorSpace;
      Walls.material = material;
    }
    return Walls.material;
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
