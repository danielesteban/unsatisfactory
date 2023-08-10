import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  MeshStandardMaterial,
  Object3D,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ADDITION, Brush, Evaluator } from 'three-bvh-csg';
import Instances from '../core/instances';
import { PoweredContainer } from '../core/container';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/rust_coarse_01_diff_1k.jpg';
import NormalMap from '../textures/rust_coarse_01_nor_gl_1k.jpg';
import RoughnessMap from '../textures/rust_coarse_01_rough_1k.jpg';

export class Pole extends PoweredContainer {
  constructor(position: Vector3, rotation: number) {
    super(position, rotation, 0, 0, 4);
  }

  override getWireConnector(): Vector3 {
    return this.position.clone().addScaledVector(Object3D.DEFAULT_UP, 2.75);
  }
};

class Poles extends Instances<Pole> {
  private static collider: BufferGeometry | undefined;
  static getCollider() {
    if (!Poles.collider) {
      Poles.collider = new BoxGeometry(0.5, 6, 0.5);
      Poles.collider.computeBoundingSphere();
    }
    return Poles.collider;
  }

  private static geometry: BufferGeometry | undefined;
  static getGeometry() {
    if (!Poles.geometry) {
      const csgEvaluator = new Evaluator();
      const base = new Brush(new BoxGeometry(0.5, 5.25, 0.5));
      base.position.set(0, -0.375, 0);
      base.updateMatrixWorld();
      const pole = new Brush(new CylinderGeometry(0.125, 0.125, 0.25));
      pole.position.set(0, 2.375, 0);
      pole.updateMatrixWorld();
      let brush = csgEvaluator.evaluate(base, pole, ADDITION);
      const connector = new Brush(new CylinderGeometry(0.25, 0.25, 0.5));
      connector.position.copy(pole.position).add(new Vector3(0, 0.375, 0));
      connector.updateMatrixWorld();
      brush = csgEvaluator.evaluate(brush, connector, ADDITION);
      Poles.geometry = mergeVertices(brush.geometry);
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
