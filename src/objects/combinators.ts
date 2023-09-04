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
import { Connectors } from '../core/container';
import Instances, { Instance } from '../core/instances';
import Physics from '../core/physics';
import SFX from '../core/sfx';
import Transformer from '../core/transformer';
import { Item } from './items';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/rust_coarse_01_diff_1k.webp';
import NormalMap from '../textures/rust_coarse_01_nor_gl_1k.webp';
import RoughnessMap from '../textures/rust_coarse_01_rough_1k.webp';
// import Achievements, { Achievement } from '../ui/stores/achievements';

export class Combinator extends Transformer {
  constructor(connectors: Connectors, position: Vector3, rotation: number, sfx: SFX) {
    super(connectors, position, rotation, 20, sfx);
  }

  private static readonly wireConnectorOffset: Vector3 = new Vector3(-1, 0, 0);
  override getWireConnector() {
    return Combinator.wireConnectorOffset.clone()
      .applyQuaternion(Instance.getQuaternion(this))
      .add(this.position)
      .addScaledVector(Object3D.DEFAULT_UP, 2.5);
  }

  // override process() {
  //   const hasOutput = super.process();
  //   if (hasOutput) {
  //     Achievements.complete(Achievement.combinator);
  //   }
  //   return hasOutput;
  // }
}

const connectors = [
  { position: new Vector3(2, -1, -1), rotation: Math.PI * 0.5 },
  { position: new Vector3(2, -1, 1), rotation: Math.PI * 0.5 },
  { position: new Vector3(-2, 0, 0), rotation: Math.PI * -0.5 },
];

class Combinators extends Instances<Combinator> {
  static override readonly cost: typeof Instances.cost = [
    { item: Item.ironPlate, count: 10 },
    { item: Item.ironRod, count: 10 },
    { item: Item.wire, count: 20 },
  ];

  private static collider: RAPIER.ColliderDesc[] | undefined;
  static getCollider() {
    if (!Combinators.collider) {
      Combinators.collider = [
        RAPIER.ColliderDesc.cuboid(2, 1, 2)
          .setTranslation(0, -1, 0),
        RAPIER.ColliderDesc.cuboid(1, 1, 1)
          .setTranslation(-1, 1, 0),
      ];
    }
    return Combinators.collider;
  }

  private static connectors: Connectors | undefined;
  static getConnectors() {
    if (!Combinators.connectors) {
      Combinators.connectors = new Connectors(connectors);
    }
    return Combinators.connectors;
  }

  private static geometry: BufferGeometry | undefined;
  static getGeometry() {
    if (!Combinators.geometry) {
      const csgEvaluator = new Evaluator();
      const base = new Brush(new BoxGeometry(4, 4, 4));
      const opening = new Brush(new BoxGeometry(1.5, 1.5, 0.5));
      const stripe = new Brush(new BoxGeometry(3.5, 0.25, 0.25));
      let brush = base;
      let carving = new Brush(new BoxGeometry(4, 4, 4));
      const cut = new Brush(new BoxGeometry(2, 4, 2));
      cut.position.set(-1, 0, 0);
      cut.updateMatrixWorld();
      carving.position.set(0, 2, 0);
      carving.updateMatrixWorld();
      carving = csgEvaluator.evaluate(carving, cut, SUBTRACTION);
      brush = csgEvaluator.evaluate(brush, carving, SUBTRACTION);
      connectors.forEach(({ position, rotation }) => {
        opening.position.copy(position);
        opening.rotation.y = rotation;
        opening.updateMatrixWorld();
        brush = csgEvaluator.evaluate(brush, opening, SUBTRACTION);
      });
      ([
        new Vector3(0, -1, 1.875),
        new Vector3(0, -1, -1.875),
      ]).forEach((position) => {
        for (let i = 0; i < 2; i ++) {
          stripe.position.copy(position);
          stripe.position.y += 0.625 * (i == 0 ? 1 : -1);
          stripe.updateMatrixWorld();
          brush = csgEvaluator.evaluate(brush, stripe, SUBTRACTION);
        }
      });
      const pole = new Brush(new CylinderGeometry(0.125, 0.125, 0.25));
      pole.position.set(-1, 2.125, 0);
      pole.updateMatrixWorld();
      brush = csgEvaluator.evaluate(brush, pole, ADDITION);
      const connector = new Brush(new CylinderGeometry(0.25, 0.25, 0.5));
      connector.position.copy(pole.position).add(new Vector3(0, 0.375, 0));
      connector.updateMatrixWorld();
      brush = csgEvaluator.evaluate(brush, connector, ADDITION);
      Combinators.geometry = mergeVertices(brush.geometry);
      Combinators.geometry.computeBoundingSphere();
    }
    return Combinators.geometry;
  }

  private static material: MeshStandardMaterial | undefined;
  static getMaterial() {
    if (!Combinators.material) {
      const material = new MeshStandardMaterial({
        map: loadTexture(DiffuseMap),
        normalMap: loadTexture(NormalMap),
        roughnessMap: loadTexture(RoughnessMap),
      });
      material.map!.anisotropy = 16;
      material.map!.colorSpace = SRGBColorSpace;
      Combinators.material = material;
    }
    return Combinators.material;
  }

  private readonly sfx: SFX;

  constructor(physics: Physics, sfx: SFX) {
    super(
      {
        collider: Combinators.getCollider(),
        geometry: Combinators.getGeometry(),
        material: Combinators.getMaterial(),
      },
      physics
    );
    this.sfx = sfx;
  }

  create(position: Vector3, rotation: number, withCost: boolean = true) {
    const { sfx } = this;
    const instance = super.addInstance(
      new Combinator(Combinators.getConnectors(), position, rotation, sfx),
      withCost
    );
    return instance;
  }
}

export default Combinators;
