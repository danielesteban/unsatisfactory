import RAPIER from '@dimforge/rapier3d-compat';
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
import { ADDITION, SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
import Instances, { Instance } from '../core/instances';
import Physics from '../core/physics';
import SFX from '../core/sfx';
import Transformer from '../core/transformer';
import { Recipe, Recipes, Transformer as ItemTransformer } from './items';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/rust_coarse_01_diff_1k.webp';
import NormalMap from '../textures/rust_coarse_01_nor_gl_1k.webp';
import RoughnessMap from '../textures/rust_coarse_01_rough_1k.webp';
import Achievements from '../ui/stores/achievements';

export class Smelter extends Transformer {
  private static connectorOffset: Vector3 = new Vector3(0, -1, 0);
  override getConnector(direction: Vector3, offset: Vector3) {
    return this.position.clone()
      .add(Smelter.connectorOffset)
      .addScaledVector(direction, 1.5)
      .add(offset);
  }

  private static readonly wireConnectorAux: Vector3 = new Vector3();
  private static readonly wireConnectorOffset: Vector3 = new Vector3(1, 0, 0);
  override getWireConnector(): Vector3 {
    return Smelter.wireConnectorAux
      .copy(Smelter.wireConnectorOffset)
      .applyQuaternion(Instance.getQuaternion(this))
      .add(this.position)
      .addScaledVector(Object3D.DEFAULT_UP, 2.5)
      .clone();
  }

  override process() {
    const hasOutput = super.process();
    if (hasOutput) {
      Achievements.complete('smelter');
    }
    return hasOutput;
  }
}

class Smelters extends Instances<Smelter> {
  private static collider: RAPIER.ColliderDesc[] | undefined;
  static getCollider() {
    if (!Smelters.collider) {
      Smelters.collider = [
        RAPIER.ColliderDesc.cuboid(1, 2, 1)
          .setTranslation(1, 0, 0),
        RAPIER.ColliderDesc.cuboid(1, 1, 1)
          .setTranslation(-1, -1, 0),
      ];
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
      Smelters.geometry = mergeVertices(brush.geometry);
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

  constructor(physics: Physics, sfx: SFX) {
    super(
      {
        collider: Smelters.getCollider(),
        geometry: Smelters.getGeometry(),
        material: Smelters.getMaterial(),
      },
      physics
    );
    this.sfx = sfx;
  }

  create(position: Vector3, rotation: number, recipe?: Recipe) {
    const { sfx } = this;
    const instance = super.addInstance(
      new Smelter(this, position, rotation, recipe || Recipes.find(({ transformer }) => transformer === ItemTransformer.smelter)!, sfx)
    );
    return instance;
  }
}

export default Smelters;
