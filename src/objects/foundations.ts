import {
  BoxGeometry,
  BufferAttribute,
  MeshStandardMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
} from 'three';
import Instances, { Instance } from '../core/instances';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/hexagonal_concrete_paving_diff_1k.jpg';
import NormalMap from '../textures/hexagonal_concrete_paving_nor_gl_1k.jpg';
import RoughnessMap from '../textures/hexagonal_concrete_paving_rough_1k.jpg';

export class Foundation extends Instance {};

class Foundations extends Instances<Foundation> {
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

  constructor() {
    super(Foundations.getGeometry(), Foundations.getMaterial());
  }
  
  create(position: Vector3, rotation: number) {
    return super.addInstance(new Foundation(position, rotation));
  }
}

export default Foundations;
