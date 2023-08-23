import RAPIER from '@dimforge/rapier3d-compat';
import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  MeshStandardMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ADDITION, SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
import Instances from '../core/instances';
import Physics from '../core/physics';
import SFX from '../core/sfx';
import Transformer from '../core/transformer';
import { Recipe, Recipes, Transformer as ItemTransformer } from './items';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/rust_coarse_01_diff_1k.webp';
import NormalMap from '../textures/rust_coarse_01_nor_gl_1k.webp';
import RoughnessMap from '../textures/rust_coarse_01_rough_1k.webp';
import Achievements, { Achievement } from '../ui/stores/achievements';

export class Fabricator extends Transformer {
  private static connectorOffset: Vector3 = new Vector3(0, -1, 0);
  override getConnector(direction: Vector3, offset: Vector3) {
    return this.position.clone()
      .add(Fabricator.connectorOffset)
      .addScaledVector(direction, 1.5)
      .add(offset);
  }

  override process() {
    const hasOutput = super.process();
    if (hasOutput) {
      Achievements.complete(Achievement.fabricator);
    }
    return hasOutput;
  }
}

class Fabricators extends Instances<Fabricator> {
  private static collider: RAPIER.ColliderDesc | undefined;
  static getCollider() {
    if (!Fabricators.collider) {
      Fabricators.collider = RAPIER.ColliderDesc.cuboid(2, 2, 1);
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
      connector.position.copy(pole.position).add(new Vector3(0, 0.375, 0));
      connector.updateMatrixWorld();
      brush = csgEvaluator.evaluate(brush, connector, ADDITION);
      Fabricators.geometry = mergeVertices(brush.geometry);
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

  constructor(physics: Physics, sfx: SFX) {
    super(
      {
        collider: Fabricators.getCollider(),
        geometry: Fabricators.getGeometry(),
        material: Fabricators.getMaterial(),
      },
      physics
    );
    this.sfx = sfx;
  }

  create(position: Vector3, rotation: number, recipe?: Recipe) {
    const { sfx } = this;
    const instance = super.addInstance(
      new Fabricator(this, position, rotation, recipe || Recipes.find(({ transformer }) => transformer === ItemTransformer.fabricator)!, sfx)
    );
    return instance;
  }
}

export default Fabricators;
