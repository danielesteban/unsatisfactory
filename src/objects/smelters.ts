import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ADDITION, SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
import Instances from '../core/instances';
import SFX from '../core/sfx';
import Transformer from '../core/transformer';
import { Recipe, Recipes, Transformer as ItemTransformer } from './items';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/rust_coarse_01_diff_1k.jpg';
import NormalMap from '../textures/rust_coarse_01_nor_gl_1k.jpg';
import RoughnessMap from '../textures/rust_coarse_01_rough_1k.jpg';

export class Smelter extends Transformer {
  private static connectorOffset: Vector3 = new Vector3(0, -1, 0);
  override getConnector(direction: Vector3, offset: Vector3) {
    return this.position.clone()
      .add(Smelter.connectorOffset)
      .addScaledVector(direction, 1.75)
      .add(offset);
  }
 
  private static aux: Vector3 = new Vector3();
  private static auxRotation: Quaternion = new Quaternion();
  private static wireConnectorOffset: Vector3 = new Vector3(1, 0, 0);
  override getWireConnector(): Vector3 {
    return this.position.clone()
      .add(
        Smelter.aux.copy(Smelter.wireConnectorOffset).applyQuaternion(
          Smelter.auxRotation.setFromAxisAngle(Object3D.DEFAULT_UP, this.rotation)
        )
      )
      .addScaledVector(Object3D.DEFAULT_UP, 2.5);
  }
};

class Smelters extends Instances<Smelter> {
  private static collider: BufferGeometry | undefined;
  static getCollider() {
    if (!Smelters.collider) {
      const colliderA = new BoxGeometry(2, 4, 2);
      colliderA.translate(1, 0, 0);
      const colliderB = new BoxGeometry(2, 2, 2);
      colliderB.translate(-1, -1, 0);
      const collider = mergeGeometries([colliderA, colliderB]);
      collider.computeBoundingSphere();
      Smelters.collider = collider;
    }
    return Smelters.collider;
  }

  private static geometry: BufferGeometry | undefined;
  static getGeometry() {
    if (!Smelters.geometry) {
      const csgEvaluator = new Evaluator();
      const base = new Brush(new BoxGeometry(4, 4, 2));
      const opening = new Brush(new BoxGeometry(1.5, 1.5, 0.5));
      const stripe = new Brush(new BoxGeometry(3.5, 0.25, 0.25));
      let brush: Brush = base;
      ([
        [new Vector3(2, -1, 0), Math.PI * 0.5],
        [new Vector3(-2, -1, 0), Math.PI * 0.5],
      ] as [Vector3, number][]).forEach(([position, rotation]) => {
        opening.position.copy(position);
        opening.rotation.y = rotation;
        opening.updateMatrixWorld();
        brush = csgEvaluator.evaluate(brush, opening, SUBTRACTION);
      });
      ([
        new Vector3(0, -1, 0.875),
        new Vector3(0, -1, -0.875),
      ]).forEach((position) => {
        for (let i = 0; i < 2; i ++) {
          stripe.position.copy(position);
          stripe.position.y += 0.625 * (i == 0 ? 1 : -1);
          stripe.updateMatrixWorld();
          brush = csgEvaluator.evaluate(brush, stripe, SUBTRACTION);
        }
      });
      const cut = new Brush(new BoxGeometry(2, 2, 2));
      cut.position.set(-1, 1, 0);
      cut.updateMatrixWorld();
      brush = csgEvaluator.evaluate(brush, cut, SUBTRACTION);
      const pole = new Brush(new CylinderGeometry(0.125, 0.125, 0.25));
      pole.position.set(1, 2.125, 0);
      pole.updateMatrixWorld();
      brush = csgEvaluator.evaluate(brush, pole, ADDITION);
      const connector = new Brush(new CylinderGeometry(0.25, 0.25, 0.5));
      connector.position.copy(pole.position).add(new Vector3(0, 0.375, 0));
      connector.updateMatrixWorld();
      brush = csgEvaluator.evaluate(brush, connector, ADDITION);
      Smelters.geometry = (brush! as Mesh).geometry;
      Smelters.geometry.computeBoundingSphere();
    }
    return Smelters.geometry;
  }

  private static material: MeshStandardMaterial | undefined;
  static getMaterial() {
    if (!Smelters.material) {
      const material = new MeshStandardMaterial({
        map: loadTexture(DiffuseMap),
        normalMap: loadTexture(NormalMap),
        roughnessMap: loadTexture(RoughnessMap),
      });
      material.map!.anisotropy = 16;
      material.map!.colorSpace = SRGBColorSpace;
      Smelters.material = material;
    }
    return Smelters.material;
  }

  private readonly sfx: SFX;

  constructor(sfx: SFX) {
    super(Smelters.getGeometry(), Smelters.getMaterial(), Smelters.getCollider());
    this.sfx = sfx;
  }

  create(position: Vector3, rotation: number, recipe?: Recipe) {
    const { sfx } = this;
    const instance = super.addInstance(
      new Smelter(position, rotation, recipe || Recipes.find(({ transformer }) => transformer === ItemTransformer.smelter)!, sfx)
    );
    return instance;
  }
}

export default Smelters;