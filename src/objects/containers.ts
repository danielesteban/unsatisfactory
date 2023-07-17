import {
  BoxGeometry,
  MeshStandardMaterial,
  Vector3,
  SRGBColorSpace,
} from 'three';
import Instances from '../core/instances';
import { loadTexture } from '../textures';
// @ts-ignore
import DiffuseMap from '../textures/rust_coarse_01_diff_1k.jpg';
// @ts-ignore
import NormalMap from '../textures/rust_coarse_01_nor_gl_1k.jpg';
// @ts-ignore
import RoughnessMap from '../textures/rust_coarse_01_rough_1k.jpg';

export type Container = {
  id: string;
  position: Vector3;
};

export type Connector = {
  container: Container;
  direction: Vector3;
};

class Containers extends Instances<Container> {
  private static geometry: BoxGeometry | undefined;
  static setupGeometry() {
    Containers.geometry = new BoxGeometry(2, 2, 2);
  }

  private static material: MeshStandardMaterial | undefined;
  static setupMaterial() {
    Containers.material = new MeshStandardMaterial({
      map: loadTexture(DiffuseMap),
      normalMap: loadTexture(NormalMap),
      roughnessMap: loadTexture(RoughnessMap),
    });
    Containers.material.map!.anisotropy = 16;
    Containers.material.map!.colorSpace = SRGBColorSpace;
    return Containers.material;
  }

  constructor() {
    if (!Containers.geometry) {
      Containers.setupGeometry();
    }
    if (!Containers.material) {
      Containers.setupMaterial();
    }
    super(Containers.geometry!, Containers.material!);
  }
}

export default Containers;
