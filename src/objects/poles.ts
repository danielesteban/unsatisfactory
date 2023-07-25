import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Mesh,
  MeshStandardMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { ADDITION, Brush, Evaluator } from 'three-bvh-csg';
import Instances from '../core/instances';
import { PoweredContainer } from '../core/container';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/rust_coarse_01_diff_1k.jpg';
import NormalMap from '../textures/rust_coarse_01_nor_gl_1k.jpg';
import RoughnessMap from '../textures/rust_coarse_01_rough_1k.jpg';

export class Pole extends PoweredContainer {
  constructor(position: Vector3, rotation: number) {
    super(position, rotation, 0, 0);
  }

  override getWireConnector(): Vector3 {
    return this.position.clone().addScaledVector(PoweredContainer.worldUp, 3);
  }
};

class Poles extends Instances<Pole> {
  private static collider: BufferGeometry | undefined;
  static getCollider() {
    if (!Poles.collider) {
      Poles.collider = new BoxGeometry(0.5, 5.75, 0.5);
      Poles.collider.translate(0, 0.375, 0);
      Poles.collider.computeBoundingSphere();
    }
    return Poles.collider;
  }

  private static geometry: BufferGeometry | undefined;
  static getGeometry() {
    if (!Poles.geometry) {
      const csgEvaluator = new Evaluator();
      const base = new Brush(new BoxGeometry(0.5, 5, 0.5));
      const pole = new Brush(new CylinderGeometry(0.125, 0.125, 0.25));
      pole.position.set(0, 2.625, 0);
      pole.updateMatrixWorld();
      let brush = csgEvaluator.evaluate(base, pole, ADDITION);
      const connector = new Brush(new CylinderGeometry(0.25, 0.25, 0.5));
      connector.position.set(0, 3, 0);
      connector.updateMatrixWorld();
      brush = csgEvaluator.evaluate(brush, connector, ADDITION);
      Poles.geometry = (brush! as Mesh).geometry;
      Poles.geometry.computeBoundingSphere();
    }
    return Poles.geometry;
  }

  private static material: MeshStandardMaterial | undefined;
  static getMaterial() {
    if (!Poles.material) {
      const material = new MeshStandardMaterial({
        map: loadTexture(DiffuseMap),
        normalMap: loadTexture(NormalMap),
        roughnessMap: loadTexture(RoughnessMap),
      });
      material.map!.anisotropy = 16;
      material.map!.colorSpace = SRGBColorSpace;
      Poles.material = material;
    }
    return Poles.material;
  }

  constructor() {
    super(Poles.getGeometry(), Poles.getMaterial(), Poles.getCollider());
  }

  create(position: Vector3, rotation: number) {
    return super.addInstance(new Pole(position, rotation));
  }
}

export default Poles;
