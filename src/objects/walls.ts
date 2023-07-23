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

export class Wall extends Instance {};

class Walls extends Instances<Wall> {
  private static geometry: BoxGeometry | undefined;
  static setupGeometry() {
    Walls.geometry = new BoxGeometry(4, 4, 0.5);
    Walls.geometry.computeBoundingSphere();
    const uv = Walls.geometry.getAttribute('uv') as BufferAttribute;
    const index = Walls.geometry.getIndex()!;
    const aux = new Vector2();
    const map = new Map();
    Walls.geometry.groups.forEach(({ start, count }, group) => {
      if ([0, 1, 2, 3].includes(group)) {
        for (let i = start; i < start + count; i++) {
          const v = index.getX(i);
          if (!map.has(v)) {
            map.set(v, true);
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
  }

  private static material: MeshStandardMaterial | undefined;
  static setupMaterial() {
    Walls.material = new MeshStandardMaterial({
      map: loadTexture(DiffuseMap),
      normalMap: loadTexture(NormalMap),
      roughnessMap: loadTexture(RoughnessMap),
    });
    Walls.material.map!.anisotropy = 16;
    Walls.material.map!.colorSpace = SRGBColorSpace;
    return Walls.material;
  }

  constructor() {
    if (!Walls.geometry) {
      Walls.setupGeometry();
    }
    if (!Walls.material) {
      Walls.setupMaterial();
    }
    super(Walls.geometry!, Walls.material!);
  }

  create(position: Vector3, rotation: number) {
    return super.addInstance(new Wall(position, rotation));
  }
}

export default Walls;
