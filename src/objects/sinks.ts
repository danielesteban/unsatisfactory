import RAPIER from '@dimforge/rapier3d-compat';
import {
  BoxGeometry,
  CylinderGeometry,
  BufferGeometry,
  Vector3,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ADDITION, SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
import { Connectors, PoweredContainer } from '../core/container';
import { Brush as BuildingType, Building, Item, Sinking } from '../core/data';
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
    super(connectors, position, rotation, 100);
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
        opening.rotation.y = rotation || 0;
        opening.updateMatrixWorld();
        brush = csg.evaluate(brush, opening, SUBTRACTION);
      });

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
