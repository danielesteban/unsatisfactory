import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Mesh,
  MeshStandardMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { ADDITION, SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
import Instances from '../core/instances';
import { PoweredContainer } from '../core/container';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/rust_coarse_01_diff_1k.jpg';
import NormalMap from '../textures/rust_coarse_01_nor_gl_1k.jpg';
import RoughnessMap from '../textures/rust_coarse_01_rough_1k.jpg';

export class Generator extends PoweredContainer {
  private readonly power: number;
  constructor(position: Vector3, rotation: number, power: number) {
    super(position, rotation, 0, 0, 4);
    this.power = power;
  }

  override getConnector(direction: Vector3, offset: Vector3) {
    return this.position.clone().addScaledVector(direction, 1.75).add(offset);
  }

  getPower() {
    return this.enabled ? this.power : 0;
  }
};

class Generators extends Instances<Generator> {
  private static collider: BufferGeometry | undefined;
  static getCollider() {
    if (!Generators.collider) {
      Generators.collider = new BoxGeometry(4, 2, 4);
      Generators.collider.computeBoundingSphere();
    }
    return Generators.collider;
  }

  private static geometry: BufferGeometry | undefined;
  static getGeometry() {
    if (!Generators.geometry) {
      const csgEvaluator = new Evaluator();
      const base = new Brush(new BoxGeometry(4, 2, 4));
      const opening = new Brush(new BoxGeometry(1.5, 1.5, 0.5));
      let brush: Brush = base;
      ([
        [new Vector3(0, 0, 2), 0],
        [new Vector3(0, 0, -2), 0],
        [new Vector3(2, 0, 0), Math.PI * 0.5],
        [new Vector3(-2, 0, 0), Math.PI * 0.5],
      ] as [Vector3, number][]).forEach(([position, rotation]) => {
        opening.position.copy(position);
        opening.rotation.y = rotation;
        opening.updateMatrixWorld();
        brush = csgEvaluator.evaluate(brush, opening, SUBTRACTION);
      });
      const pole = new Brush(new CylinderGeometry(0.125, 0.125, 0.25));
      pole.position.set(0, 1.125, 0);
      pole.updateMatrixWorld();
      brush = csgEvaluator.evaluate(brush, pole, ADDITION);
      const connector = new Brush(new CylinderGeometry(0.25, 0.25, 0.5));
      connector.position.set(0, 1.5, 0);
      connector.updateMatrixWorld();
      brush = csgEvaluator.evaluate(brush, connector, ADDITION);
      Generators.geometry = (brush! as Mesh).geometry;
      Generators.geometry.computeBoundingSphere();
    }
    return Generators.geometry;
  }

  private static material: MeshStandardMaterial | undefined;
  static getMaterial() {
    if (!Generators.material) {
      const material = new MeshStandardMaterial({
        map: loadTexture(DiffuseMap),
        normalMap: loadTexture(NormalMap),
        roughnessMap: loadTexture(RoughnessMap),
      });
      material.map!.anisotropy = 16;
      material.map!.colorSpace = SRGBColorSpace;
      Generators.material = material;
    }
    return Generators.material;
  }

  constructor() {
    super(Generators.getGeometry(), Generators.getMaterial(), Generators.getCollider());
  }

  create(position: Vector3, rotation: number, power: number = 100) {
    return super.addInstance(new Generator(position, rotation, power));
  }
}

export default Generators;
