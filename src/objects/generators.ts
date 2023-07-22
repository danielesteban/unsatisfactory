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
    super(position, rotation, 0, 0);
    this.power = power;
  }

  getPower() {
    return this.enabled ? this.power : 0;
  }
};

class Generators extends Instances<Generator> {
  private static collider: BufferGeometry | undefined;
  static setupCollider() {
    Generators.collider = new BoxGeometry(4, 2, 4);
    Generators.collider.computeBoundingSphere();
  }

  private static geometry: BufferGeometry | undefined;
  static setupGeometry() {
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

  private static material: MeshStandardMaterial | undefined;
  static setupMaterial() {
    Generators.material = new MeshStandardMaterial({
      map: loadTexture(DiffuseMap),
      normalMap: loadTexture(NormalMap),
      roughnessMap: loadTexture(RoughnessMap),
    });
    Generators.material.map!.anisotropy = 16;
    Generators.material.map!.colorSpace = SRGBColorSpace;
    return Generators.material;
  }

  constructor() {
    if (!Generators.collider) {
      Generators.setupCollider();
    }
    if (!Generators.geometry) {
      Generators.setupGeometry();
    }
    if (!Generators.material) {
      Generators.setupMaterial();
    }
    super(Generators.geometry!, Generators.material!, Generators.collider!);
  }

  create(position: Vector3, rotation: number, power: number = 100) {
    return super.addInstance(new Generator(position, rotation, power));
  }
}

export default Generators;
