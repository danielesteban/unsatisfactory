import RAPIER from '@dimforge/rapier3d-compat';
import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Object3D,
  Vector3,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ADDITION, SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
import { Connectors } from '../core/container';
import { Brush as BuildingType, Building } from '../core/data';
import Instances, { Instance } from '../core/instances';
import { ContainerMaterials } from '../core/materials';
import Physics from '../core/physics';
import SFX from '../core/sfx';
import Transformer from '../core/transformer';
import Achievements, { Achievement } from '../ui/stores/achievements';

export class Smelter extends Transformer {
  constructor(connectors: Connectors, position: Vector3, rotation: number, sfx: SFX) {
    super(connectors, position, rotation, 10, sfx);
  }

  private static readonly wireConnectorOffset: Vector3 = new Vector3(-1, 0, 0);
  override getWireConnector() {
    return Smelter.wireConnectorOffset.clone()
      .applyQuaternion(Instance.getQuaternion(this))
      .add(this.position)
      .addScaledVector(Object3D.DEFAULT_UP, 2.5);
  }

  override process() {
    const hasOutput = super.process();
    if (hasOutput) {
      Achievements.complete(Achievement.smelter);
    }
    return hasOutput;
  }
}

const connectors = [
  { position: new Vector3(2, -1, 0), rotation: Math.PI * 0.5 },
  { position: new Vector3(-2, -1, 0), rotation: Math.PI * -0.5 },
];

class Smelters extends Instances<Smelter> {
  private static collider: RAPIER.ColliderDesc[] | undefined;
  static getCollider() {
    if (!Smelters.collider) {
      Smelters.collider = [
        RAPIER.ColliderDesc.cuboid(1, 2, 1)
          .setTranslation(-1, 0, 0),
        RAPIER.ColliderDesc.cuboid(1, 1, 1)
          .setTranslation(1, -1, 0),
      ];
    }
    return Smelters.collider;
  }
  
  private static connectors: Connectors | undefined;
  static getConnectors() {
    if (!Smelters.connectors) {
      Smelters.connectors = new Connectors(connectors);
    }
    return Smelters.connectors;
  }

  protected static override readonly cost = Building[BuildingType.smelter]!;

  private static geometry: BufferGeometry | undefined;
  static getGeometry() {
    if (!Smelters.geometry) {
      const csg = new Evaluator();
      const material = Smelters.getMaterial();
      const base = new Brush(new BoxGeometry(4, 4, 2), material[0]);
      const cut = new Brush(new BoxGeometry(2, 2, 2), material[0]);
      cut.position.set(1, 1, 0);
      cut.updateMatrixWorld();
      let brush = csg.evaluate(base, cut, SUBTRACTION);

      const pole = new Brush(new CylinderGeometry(0.125, 0.125, 0.25), material[1]);
      pole.position.set(-1, 2.125, 0);
      pole.updateMatrixWorld();
      brush = csg.evaluate(brush, pole, ADDITION);
      const cap = new Brush(new CylinderGeometry(0.25, 0.25, 0.5), material[0]);
      cap.position.copy(pole.position).add(new Vector3(0, 0.375, 0));
      cap.updateMatrixWorld();
      brush = csg.evaluate(brush, cap, ADDITION);

      const opening = new Brush(new BoxGeometry(1.5, 1.5, 0.5), material[1]);
      ([
        [new Vector3(2, -1, 0), Math.PI * 0.5],
        [new Vector3(-2, -1, 0), Math.PI * 0.5],
      ] as [Vector3, number][]).forEach(([position, rotation]) => {
        opening.position.copy(position);
        opening.rotation.y = rotation;
        opening.updateMatrixWorld();
        brush = csg.evaluate(brush, opening, SUBTRACTION);
      });
      const stripe = new Brush(new BoxGeometry(3.5, 0.25, 0.25), material[1]);
      ([
        new Vector3(0, -1, 0.875),
        new Vector3(0, -1, -0.875),
      ]).forEach((position) => {
        for (let i = 0; i < 2; i ++) {
          stripe.position.copy(position);
          stripe.position.y += 0.625 * (i == 0 ? 1 : -1);
          stripe.updateMatrixWorld();
          brush = csg.evaluate(brush, stripe, SUBTRACTION);
        }
      });

      Smelters.geometry = mergeVertices(brush.geometry);
      Smelters.geometry.computeBoundingSphere();
    }
    return Smelters.geometry;
  }

  static getMaterial() {
    return ContainerMaterials;
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

  create(position: Vector3, rotation: number, withCost: boolean = true) {
    const { sfx } = this;
    const instance = super.addInstance(
      new Smelter(Smelters.getConnectors(), position, rotation, sfx),
      withCost
    );
    return instance;
  }
}

export default Smelters;
