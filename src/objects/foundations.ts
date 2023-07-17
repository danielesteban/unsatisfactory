import {
  BufferAttribute,
  BoxGeometry,
  MeshStandardMaterial,
  Vector2,
  Vector3,
  SRGBColorSpace,
} from 'three';
import Instances from '../core/instances';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/hexagonal_concrete_paving_diff_1k.jpg';
import NormalMap from '../textures/hexagonal_concrete_paving_nor_gl_1k.jpg';
import RoughnessMap from '../textures/hexagonal_concrete_paving_rough_1k.jpg';

export type Foundation = {
  id: string;
  position: Vector3;
};

class Foundations extends Instances<Foundation> {
  private static geometry: BoxGeometry | undefined;
  static setupGeometry() {
    Foundations.geometry = new BoxGeometry(4, 1, 4);
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

  private static material: MeshStandardMaterial | undefined;
  static setupMaterial() {
    Foundations.material = new MeshStandardMaterial({
      map: loadTexture(DiffuseMap),
      normalMap: loadTexture(NormalMap),
      roughnessMap: loadTexture(RoughnessMap),
    });
    Foundations.material.map!.anisotropy = 16;
    Foundations.material.map!.colorSpace = SRGBColorSpace;
    return Foundations.material;
  }

  constructor() {
    if (!Foundations.geometry) {
      Foundations.setupGeometry();
    }
    if (!Foundations.material) {
      Foundations.setupMaterial();
    }
    super(Foundations.geometry!, Foundations.material!);
  }
}

export default Foundations;
