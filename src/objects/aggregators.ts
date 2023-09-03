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
import { Connectors } from '../core/container';
import Instances from '../core/instances';
import Physics from '../core/physics';
import SFX from '../core/sfx';
import Transformer from '../core/transformer';
import { Item } from './items';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/rust_coarse_01_diff_1k.webp';
import NormalMap from '../textures/rust_coarse_01_nor_gl_1k.webp';
import RoughnessMap from '../textures/rust_coarse_01_rough_1k.webp';
// import Achievements, { Achievement } from '../ui/stores/achievements';

export class Aggregator extends Transformer {
  constructor(connectors: Connectors, position: Vector3, rotation: number, sfx: SFX) {
    super(connectors, position, rotation, 50, sfx);
  }

  // override process() {
  //   const hasOutput = super.process();
  //   if (hasOutput) {
  //     Achievements.complete(Achievement.aggregator);
  //   }
  //   return hasOutput;
  // }
}

const connectors = [
  { position: new Vector3(4, -1, -3), rotation: Math.PI * 0.5 },
  { position: new Vector3(4, -1, -1), rotation: Math.PI * 0.5 },
  { position: new Vector3(4, -1, 1), rotation: Math.PI * 0.5 },
  { position: new Vector3(4, -1, 3), rotation: Math.PI * 0.5 },
  { position: new Vector3(-4, 0, 0), rotation: Math.PI * -0.5 },
];

class Aggregators extends Instances<Aggregator> {
  static override readonly cost: typeof Instances.cost = [
    { item: Item.ironPlate, count: 5 },
    { item: Item.ironRod, count: 10 },
    { item: Item.wire, count: 20 },
  ];

  private static collider: RAPIER.ColliderDesc[] | undefined;
  static getCollider() {
    if (!Aggregators.collider) {
      Aggregators.collider = [
        RAPIER.ColliderDesc.cuboid(4, 1, 4)
          .setTranslation(0, -1, 0),
        RAPIER.ColliderDesc.cuboid(4, 1, 2)
          .setTranslation(0, 1, 0),
      ];
    }
    return Aggregators.collider;
  }

  private static connectors: Connectors | undefined;
  static getConnectors() {
    if (!Aggregators.connectors) {
      Aggregators.connectors = new Connectors(connectors);
    }
    return Aggregators.connectors;
  }

  private static geometry: BufferGeometry | undefined;
  static getGeometry() {
    if (!Aggregators.geometry) {
      const csgEvaluator = new Evaluator();
      const base = new Brush(new BoxGeometry(8, 4, 8));
      const opening = new Brush(new BoxGeometry(1.5, 1.5, 0.5));
      const carving = new Brush(new BoxGeometry(8, 4, 8));
      const stripe = new Brush(new BoxGeometry(3.5, 0.25, 0.25));
      let brush = base;
      carving.position.set(0, 2, -6);
      carving.updateMatrixWorld();
      brush = csgEvaluator.evaluate(brush, carving, SUBTRACTION);
      carving.position.set(0, 2, 6);
      carving.updateMatrixWorld();
      brush = csgEvaluator.evaluate(brush, carving, SUBTRACTION);
      connectors.forEach(({ position, rotation }) => {
        opening.position.copy(position);
        opening.rotation.y = rotation;
        opening.updateMatrixWorld();
        brush = csgEvaluator.evaluate(brush, opening, SUBTRACTION);
      });
      ([
        new Vector3(0, -1, 3.875),
        new Vector3(0, -1, -3.875),
      ]).forEach((position) => {
        for (let i = 0; i < 2; i ++) {
          stripe.position.copy(position);
          stripe.position.y += 0.625 * (i == 0 ? 1 : -1);
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
      Aggregators.geometry = mergeVertices(brush.geometry);
      Aggregators.geometry.computeBoundingSphere();
    }
    return Aggregators.geometry;
  }

  private static material: MeshStandardMaterial | undefined;
  static getMaterial() {
    if (!Aggregators.material) {
      const material = new MeshStandardMaterial({
        map: loadTexture(DiffuseMap),
        normalMap: loadTexture(NormalMap),
        roughnessMap: loadTexture(RoughnessMap),
      });
      material.map!.anisotropy = 16;
      material.map!.colorSpace = SRGBColorSpace;
      Aggregators.material = material;
    }
    return Aggregators.material;
  }

  private readonly sfx: SFX;

  constructor(physics: Physics, sfx: SFX) {
    super(
      {
        collider: Aggregators.getCollider(),
        geometry: Aggregators.getGeometry(),
        material: Aggregators.getMaterial(),
      },
      physics
    );
    this.sfx = sfx;
  }

  create(position: Vector3, rotation: number, withCost: boolean = true) {
    const { sfx } = this;
    const instance = super.addInstance(
      new Aggregator(Aggregators.getConnectors(), position, rotation, sfx),
      withCost
    );
    return instance;
  }
}

export default Aggregators;
