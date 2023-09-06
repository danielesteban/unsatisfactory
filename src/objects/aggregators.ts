import RAPIER from '@dimforge/rapier3d-compat';
import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Vector3,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ADDITION, SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
import { Connectors } from '../core/container';
import Instances from '../core/instances';
import { ContainerMaterials } from '../core/materials';
import Physics from '../core/physics';
import SFX from '../core/sfx';
import Transformer from '../core/transformer';
import { Item } from './items';
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
    { item: Item.rotor, count: 5 },
    { item: Item.frame, count: 10 },
    { item: Item.wire, count: 50 },
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
      const csg = new Evaluator();
      const material = Aggregators.getMaterial();
      const base = new Brush(new BoxGeometry(8, 4, 8), material[0]);
      const carving = new Brush(new BoxGeometry(8, 4, 8), material[0]);

      let brush = base;
      carving.position.set(0, 2, -6);
      carving.updateMatrixWorld();
      brush = csg.evaluate(brush, carving, SUBTRACTION);
      carving.position.set(0, 2, 6);
      carving.updateMatrixWorld();
      brush = csg.evaluate(brush, carving, SUBTRACTION);

      const pole = new Brush(new CylinderGeometry(0.125, 0.125, 0.25), material[1]);
      pole.position.set(0, 2.125, 0);
      pole.updateMatrixWorld();
      brush = csg.evaluate(brush, pole, ADDITION);
      const cap = new Brush(new CylinderGeometry(0.25, 0.25, 0.5), material[0]);
      cap.position.copy(pole.position).add(new Vector3(0, 0.375, 0));
      cap.updateMatrixWorld();
      brush = csg.evaluate(brush, cap, ADDITION);

      const opening = new Brush(new BoxGeometry(1.5, 1.5, 0.5), material[1]);
      connectors.forEach(({ position, rotation }) => {
        opening.position.copy(position);
        opening.rotation.y = rotation;
        opening.updateMatrixWorld();
        brush = csg.evaluate(brush, opening, SUBTRACTION);
      });
      const stripe = new Brush(new BoxGeometry(3.5, 0.25, 0.25), material[1]);
      ([
        new Vector3(0, -1, 3.875),
        new Vector3(0, -1, -3.875),
      ]).forEach((position) => {
        for (let i = 0; i < 2; i ++) {
          stripe.position.copy(position);
          stripe.position.y += 0.625 * (i == 0 ? 1 : -1);
          stripe.updateMatrixWorld();
          brush = csg.evaluate(brush, stripe, SUBTRACTION);
        }
      });

      Aggregators.geometry = mergeVertices(brush.geometry);
      Aggregators.geometry.computeBoundingSphere();
    }
    return Aggregators.geometry;
  }

  static getMaterial() {
    return ContainerMaterials;
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
