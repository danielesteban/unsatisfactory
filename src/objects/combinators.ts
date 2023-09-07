import RAPIER from '@dimforge/rapier3d-compat';
import {
  BoxGeometry,
  BufferGeometry,
  Object3D,
  Vector3,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
import { Connectors, ConnectorsCSG, WireConnectorCSG } from '../core/container';
import { Brush as BuildingType, Building } from '../core/data';
import Instances, { Instance } from '../core/instances';
import { ContainerMaterials } from '../core/materials';
import Physics from '../core/physics';
import SFX from '../core/sfx';
import Transformer from '../core/transformer';
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
  private static collider: RAPIER.ColliderDesc[] | undefined;
  static getCollider() {
    if (!Combinators.collider) {
      Combinators.collider = [
        RAPIER.ColliderDesc.cuboid(2, 1, 2)
          .setTranslation(0, -1, 0),
        RAPIER.ColliderDesc.cuboid(1, 1, 2)
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

  protected static override readonly cost = Building[BuildingType.fabricator]!;

  private static geometry: BufferGeometry | undefined;
  static getGeometry() {
    if (!Combinators.geometry) {
      const csg = new Evaluator();
      const material = Combinators.getMaterial();
      const base = new Brush(new BoxGeometry(4, 4, 4), material[0]);
      const cut = new Brush(new BoxGeometry(2, 2, 4), material[0]);
      cut.position.set(1, 1, 0);
      cut.updateMatrixWorld();
      let brush = csg.evaluate(base, cut, SUBTRACTION);

      brush = WireConnectorCSG(csg, brush, new Vector3(-1, 2.125, 0), material[0], material[1]);
      brush = ConnectorsCSG(csg, brush, connectors, material[1]);
      const stripe = new Brush(new BoxGeometry(3.5, 0.25, 0.25), material[1]);
      ([
        new Vector3(0, -1, 1.875),
        new Vector3(0, -1, -1.875),
      ]).forEach((position) => {
        for (let i = 0; i < 2; i ++) {
          stripe.position.copy(position);
          stripe.position.y += 0.625 * (i == 0 ? 1 : -1);
          stripe.updateMatrixWorld();
          brush = csg.evaluate(brush, stripe, SUBTRACTION);
        }
      });

      Combinators.geometry = mergeVertices(brush.geometry);
      Combinators.geometry.computeBoundingSphere();
    }
    return Combinators.geometry;
  }

  static getMaterial() {
    return ContainerMaterials;
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
