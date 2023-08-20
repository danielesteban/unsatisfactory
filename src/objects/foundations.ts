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
      const uv = Foundations.geometry.getAttribute('uv') as BufferAttribute;
      const index = Foundations.geometry.getIndex()!;
      const aux = new Vector2();
      const map = new Map();
      Foundations.geometry.groups.forEach(({ start, count }, group) => {
        if ([0, 1, 4, 5].includes(group)) {
          for (let i = start; i < start + count; i++) {
            const v = index.getX(i);
            if (!map.has(v)) {
              map.set(v, true);
              aux.fromBufferAttribute(uv, v);
              uv.setXY(v, aux.x, aux.y / 4);
            }
          }
        }
      });
    }
    return Foundations.geometry;
  }

  private static material: MeshStandardMaterial | undefined;
  static getMaterial() {
    if (!Foundations.material) {
      const material = new MeshStandardMaterial({
        map: loadTexture(DiffuseMap),
        normalMap: loadTexture(NormalMap),
        roughnessMap: loadTexture(RoughnessMap),
      });
      material.map!.anisotropy = 16;
      material.map!.colorSpace = SRGBColorSpace;
      Foundations.material = material;
    }
    return Foundations.material;
  }

  constructor(physics: Physics) {
    super(Foundations.getCollider(), Foundations.getGeometry(), Foundations.getMaterial(), physics);
  }
  
  create(position: Vector3, rotation: number) {
    return super.addInstance(new Foundation(position, rotation));
  }
}

export default Foundations;
