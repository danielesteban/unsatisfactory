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
  static getGeometry() {
    if (!Walls.geometry) {
      const geometry = new BoxGeometry(4, 4, 0.5);
      geometry.computeBoundingSphere();
      const uv = geometry.getAttribute('uv') as BufferAttribute;
      const index = geometry.getIndex()!;
      const aux = new Vector2();
      const map = new Map();
      geometry.groups.forEach(({ start, count }, group) => {
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

  constructor() {
    super(Walls.getGeometry(), Walls.getMaterial());
  }

  create(position: Vector3, rotation: number) {
    return super.addInstance(new Wall(position, rotation));
  }
}

export default Walls;
