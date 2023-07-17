import {
  BoxGeometry,
  BufferGeometry,
  Mesh,
  MeshStandardMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
import Instances from '../core/instances';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/rust_coarse_01_diff_1k.jpg';
import NormalMap from '../textures/rust_coarse_01_nor_gl_1k.jpg';
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
  private static geometry: BufferGeometry | undefined;
  static setupGeometry() {
    const csgEvaluator = new Evaluator();
    const base = new Brush(new BoxGeometry(2, 2, 2));
    const opening = new Brush(new BoxGeometry(1.5, 1.5, 0.5));
    let brush: Brush = base;
    ([
      [new Vector3(0, 0, 1), 0],
      [new Vector3(0, 0, -1), 0],
      [new Vector3(1, 0, 0), Math.PI * 0.5],
      [new Vector3(-1, 0, 0), Math.PI * 0.5],
    ] as [Vector3, number][]).forEach(([position, rotation]) => {
      opening.position.copy(position);
      opening.rotation.y = rotation;
      opening.updateMatrixWorld();
      brush = csgEvaluator.evaluate(brush, opening, SUBTRACTION);
    });
    Containers.geometry = (brush! as Mesh).geometry;
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
