import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { ADDITION, SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
import Instances from '../core/instances';
import SFX from '../core/sfx';
import Transformer from '../core/transformer';
import { Recipe, Recipes, Transformer as ItemTransformer } from './items';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/rust_coarse_01_diff_1k.jpg';
import NormalMap from '../textures/rust_coarse_01_nor_gl_1k.jpg';
import RoughnessMap from '../textures/rust_coarse_01_rough_1k.jpg';

export class Fabricator extends Transformer {
  private static connectorOffset: Vector3 = new Vector3(0, -1, 0);
  override getConnector(direction: Vector3, offset: Vector3) {
    return this.position.clone()
      .add(Fabricator.connectorOffset)
      .addScaledVector(direction, 1.75)
      .add(offset);
  }

  override getWireConnector(): Vector3 {
    return this.position.clone().addScaledVector(Object3D.DEFAULT_UP, 2.5);
  }
};

class Fabricators extends Instances<Fabricator> {
  private static collider: BufferGeometry | undefined;
  static getCollider() {
    if (!Fabricators.collider) {
      Fabricators.collider = new BoxGeometry(4, 4, 2);
      Fabricators.collider.computeBoundingSphere();
    }
    return Fabricators.collider;
  }

  private static geometry: BufferGeometry | undefined;
  static getGeometry() {
    if (!Fabricators.geometry) {
      const csgEvaluator = new Evaluator();
      const base = new Brush(new BoxGeometry(4, 4, 2));
      const opening = new Brush(new BoxGeometry(1.5, 1.5, 0.5));
      const stripe = new Brush(new BoxGeometry(0.25, 3.5, 0.25));
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
        new Vector3(0, 0, 0.875),
        new Vector3(0, 0, -0.875),
      ]).forEach((position) => {
        for (let i = 0; i < 2; i ++) {
          stripe.position.copy(position);
          stripe.position.x += 0.625 * (i == 0 ? 1 : -1);
          stripe.updateMatrixWorld();
          brush = csgEvaluator.evaluate(brush, stripe, SUBTRACTION);
        }
      });
      const pole = new Brush(new CylinderGeometry(0.125, 0.125, 0.25));
      pole.position.set(0, 2.125, 0);
      pole.updateMatrixWorld();
      brush = csgEvaluator.evaluate(brush, pole, ADDITION);
      const connector = new Brush(new CylinderGeometry(0.25, 0.25, 0.5));
      connector.position.set(0, 2.5, 0);
      connector.updateMatrixWorld();
      brush = csgEvaluator.evaluate(brush, connector, ADDITION);
      Fabricators.geometry = (brush! as Mesh).geometry;
      Fabricators.geometry.computeBoundingSphere();
    }
    return Fabricators.geometry;
  }

  private static material: MeshStandardMaterial | undefined;
  static getMaterial() {
    if (!Fabricators.material) {
      const material = new MeshStandardMaterial({
        map: loadTexture(DiffuseMap),
        normalMap: loadTexture(NormalMap),
        roughnessMap: loadTexture(RoughnessMap),
      });
      material.map!.anisotropy = 16;
      material.map!.colorSpace = SRGBColorSpace;
      Fabricators.material = material;
    }
    return Fabricators.material;
  }

  private readonly sfx: SFX;

  constructor(sfx: SFX) {
    super(Fabricators.getGeometry(), Fabricators.getMaterial(), Fabricators.getCollider());
    this.sfx = sfx;
  }

  create(position: Vector3, rotation: number, recipe?: Recipe) {
    const { sfx } = this;
    const instance = super.addInstance(
      new Fabricator(position, rotation, recipe || Recipes.find(({ transformer }) => transformer === ItemTransformer.fabricator)!, sfx)
    );
    return instance;
  }
}

export default Fabricators;
