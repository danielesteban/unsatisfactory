import RAPIER from '@dimforge/rapier3d-compat';
import {
  CylinderGeometry,
  BufferGeometry,
  Vector3,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Brush, Evaluator } from 'three-bvh-csg';
import { Connectors, ConnectorsCSG, PoweredContainer, WireConnectorCSG } from '../core/container';
import { Brush as BuildingType, Building, Consumption, Item, Sinking } from '../core/data';
import Instances from '../core/instances';
import { ContainerMaterials } from '../core/materials';
import Physics from '../core/physics';
import Points from '../ui/stores/points';

export class Sink extends PoweredContainer<
  {
    type: 'points';
    count: number;
  }
> {
  constructor(connectors: Connectors, position: Vector3, rotation: number) {
    super(connectors, position, rotation, Consumption[BuildingType.sink]!);
  }

  override canInput() {
    return this.enabled && this.powered;
  }

  override input(item: Item) {
    Points.increment((Sinking[item] || 1));
  }
}

const connectors = [
  { position: new Vector3(0, 0, 1.875) },
  { position: new Vector3(0, 0, -1.875), rotation: Math.PI * -1 },
  { position: new Vector3(1.875, 0, 0), rotation: Math.PI * 0.5 },
  { position: new Vector3(-1.875, 0, 0), rotation: Math.PI * -0.5 },
];

class Sinks extends Instances<Sink> {
  private static collider: RAPIER.ColliderDesc | undefined;
  static getCollider() {
    if (!Sinks.collider) {
      Sinks.collider = RAPIER.ColliderDesc.cylinder(2, 2);
    }
    return Sinks.collider;
  }

  private static connectors: Connectors | undefined;
  static getConnectors() {
    if (!Sinks.connectors) {
      Sinks.connectors = new Connectors(connectors);
    }
    return Sinks.connectors;
  }

  protected static override readonly cost = Building[BuildingType.sink]!;

  private static geometry: BufferGeometry | undefined;
  static getGeometry() {
    if (!Sinks.geometry) {
      const csg = new Evaluator();
      const material = Sinks.getMaterial();
      const base = new Brush(new CylinderGeometry(2, 2, 4), material[0]);
      let brush: Brush = base;

      brush = WireConnectorCSG(csg, brush, new Vector3(0, 2.125, 0), material[0], material[1]);
      brush = ConnectorsCSG(csg, brush, connectors, material[1]);

      Sinks.geometry = mergeVertices(brush.geometry);
      Sinks.geometry.computeBoundingSphere();
    }
    return Sinks.geometry;
  }

  static getMaterial() {
    return ContainerMaterials;
  }

  constructor(physics: Physics) {
    super(
      {
        collider: Sinks.getCollider(),
        geometry: Sinks.getGeometry(),
        material: Sinks.getMaterial(),
      },
      physics
    );
  }

  create(position: Vector3, rotation: number, withCost: boolean = true) {
    return super.addInstance(
      new Sink(Sinks.getConnectors(), position, rotation),
      withCost
    );
  }
}

export default Sinks;
