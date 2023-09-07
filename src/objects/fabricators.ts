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
import { Brush as BuildingType, Building } from '../core/data';
import Instances from '../core/instances';
import { ContainerMaterials } from '../core/materials';
import Physics from '../core/physics';
import SFX from '../core/sfx';
import Transformer from '../core/transformer';
import Achievements, { Achievement } from '../ui/stores/achievements';

export class Fabricator extends Transformer {
  constructor(connectors: Connectors, position: Vector3, rotation: number, sfx: SFX) {
    super(connectors, position, rotation, 10, sfx);
  }

  override process() {
    const hasOutput = super.process();
    if (hasOutput) {
      Achievements.complete(Achievement.fabricator);
    }
    return hasOutput;
  }
}

const connectors = [
  { position: new Vector3(2, -1, 0), rotation: Math.PI * 0.5 },
  { position: new Vector3(-2, -1, 0), rotation: Math.PI * -0.5 },
];

class Fabricators extends Instances<Fabricator> {
  private static collider: RAPIER.ColliderDesc | undefined;
  static getCollider() {
    if (!Fabricators.collider) {
      Fabricators.collider = RAPIER.ColliderDesc.cuboid(2, 2, 1);
    }
    return Fabricators.collider;
  }
  
  private static connectors: Connectors | undefined;
  static getConnectors() {
    if (!Fabricators.connectors) {
      Fabricators.connectors = new Connectors(connectors);
    }
    return Fabricators.connectors;
  }

  protected static override readonly cost = Building[BuildingType.fabricator];

  private static geometry: BufferGeometry | undefined;
  static getGeometry() {
    if (!Fabricators.geometry) {
      const csgEvaluator = new Evaluator();
      const material = Fabricators.getMaterial();
      const base = new Brush(new BoxGeometry(4, 4, 2), material[0]);
      let brush: Brush = base;

      const pole = new Brush(new CylinderGeometry(0.125, 0.125, 0.25), material[1]);
      pole.position.set(0, 2.125, 0);
      pole.updateMatrixWorld();
      brush = csgEvaluator.evaluate(brush, pole, ADDITION);
      const cap = new Brush(new CylinderGeometry(0.25, 0.25, 0.5), material[0]);
      cap.position.copy(pole.position).add(new Vector3(0, 0.375, 0));
      cap.updateMatrixWorld();
      brush = csgEvaluator.evaluate(brush, cap, ADDITION);

      const opening = new Brush(new BoxGeometry(1.5, 1.5, 0.5), material[1]);
      connectors.forEach(({ position, rotation }) => {
        opening.position.copy(position);
        opening.rotation.y = rotation;
        opening.updateMatrixWorld();
        brush = csgEvaluator.evaluate(brush, opening, SUBTRACTION);
      });
      const stripe = new Brush(new BoxGeometry(0.25, 3.5, 0.25), material[1]);
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

      Fabricators.geometry = mergeVertices(brush.geometry);
      Fabricators.geometry.computeBoundingSphere();
    }
    return Fabricators.geometry;
  }

  static getMaterial() {
    return ContainerMaterials;
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

  create(position: Vector3, rotation: number, withCost: boolean = true) {
    const { sfx } = this;
    const instance = super.addInstance(
      new Fabricator(Fabricators.getConnectors(), position, rotation, sfx),
      withCost
    );
    return instance;
  }
}

export default Fabricators;
