import RAPIER from '@dimforge/rapier3d-compat';
import {
  BoxGeometry,
  BufferGeometry,
  Object3D,
  Vector3,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Brush, Evaluator } from 'three-bvh-csg';
import { Connectors, PoweredContainer, WireConnectorCSG } from '../core/container';
import { Brush as BuildingType, Building } from '../core/data';
import Instances from '../core/instances';
import { ContainerMaterials } from '../core/materials';
import Physics from '../core/physics';

// @dani @hack @grievance
// The poles aren't really containers.
// Nor they can be powered.
// But they need to be able to be wired up.
// OOP inheritance has failed me once again.
// I should have listened to the ECS evangelists.
// I'm just too lazy to care for switching to composition at this stage.
export class Pole extends PoweredContainer {
  constructor(connectors: Connectors, position: Vector3, rotation: number) {
    super(connectors, position, rotation, 0, 4);
  }

  override getWireConnector() {
    return this.position.clone()
      .addScaledVector(Object3D.DEFAULT_UP, 2.75);
  }
}

class Poles extends Instances<Pole> {
  private static collider: RAPIER.ColliderDesc | undefined;
  static getCollider() {
    if (!Poles.collider) {
      Poles.collider = RAPIER.ColliderDesc.cuboid(0.25, 3, 0.25);
    }
    return Poles.collider;
  }

  private static connectors: Connectors | undefined;
  static getConnectors() {
    if (!Poles.connectors) {
      Poles.connectors = new Connectors([]);
    }
    return Poles.connectors;
  }

  protected static override readonly cost = Building[BuildingType.pole]!;

  private static geometry: BufferGeometry | undefined;
  static getGeometry() {
    if (!Poles.geometry) {
      const csg = new Evaluator();
      const material = Poles.getMaterial();
      const base = new Brush(new BoxGeometry(0.5, 5.25, 0.5), material[0]);
      base.position.set(0, -0.375, 0);
      base.updateMatrixWorld();
      let brush = base;

      brush = WireConnectorCSG(csg, brush, new Vector3(0, 2.375, 0), material[0], material[1]);

      Poles.geometry = mergeVertices(brush.geometry);
      Poles.geometry.computeBoundingSphere();
    }
    return Poles.geometry;
  }

  static getMaterial() {
    return ContainerMaterials;
  }

  constructor(physics: Physics) {
    super(
      {
        collider: Poles.getCollider(),
        geometry: Poles.getGeometry(),
        material: Poles.getMaterial(),
      },
      physics
    );
  }

  create(position: Vector3, rotation: number, withCost: boolean = true) {
    return super.addInstance(
      new Pole(Poles.getConnectors(), position, rotation),
      withCost
    );
  }
}

export default Poles;
