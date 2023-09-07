import RAPIER from '@dimforge/rapier3d-compat';
import {
  BoxGeometry,
  BufferGeometry,
  Vector3,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
import Container, { Connectors } from '../core/container';
import { Brush as BuildingType, Building, Item } from '../core/data';
import Instances from '../core/instances';
import { ContainerMaterials } from '../core/materials';
import Physics from '../core/physics';
import Inventory from '../ui/stores/inventory';

export class Buffer extends Container {
  private item: Item;

  constructor(connectors: Connectors, position: Vector3, rotation: number) {
    super(connectors, position, rotation);
    this.item = Item.none;
  }

  setItem(item: Item) {
    this.item = item;
  }

  override dispose() {
    const { item } = this;
    if (item !== Item.none) {
      Inventory.input(item);
    }
  }

  override canInput() {
    const { item } = this;
    return item === Item.none;
  }

  override input(item: Item) {
    this.item = item;
  }
  
  override canOutput() {
    const { item } = this;
    return item !== Item.none;
  }

  override output() {
    const { item } = this;
    this.item = Item.none;
    return item;
  }

  override serialize() {
    const { item } = this;
    return [
      ...super.serialize(),
      ...(item !== Item.none ? [item] : []),
    ];
  }
}

const connectors = [
  { position: new Vector3(0, 0, 1) },
  { position: new Vector3(0, 0, -1), rotation: Math.PI * -1 },
  { position: new Vector3(1, 0, 0), rotation: Math.PI * 0.5 },
  { position: new Vector3(-1, 0, 0), rotation: Math.PI * -0.5 },
];

class Buffers extends Instances<Buffer> {
  private static collider: RAPIER.ColliderDesc | undefined;
  static getCollider() {
    if (!Buffers.collider) {
      Buffers.collider = RAPIER.ColliderDesc.cuboid(1, 1, 1);
    }
    return Buffers.collider;
  }

  private static connectors: Connectors | undefined;
  static getConnectors() {
    if (!Buffers.connectors) {
      Buffers.connectors = new Connectors(connectors);
    }
    return Buffers.connectors;
  }

  protected static override readonly cost = Building[BuildingType.buffer]!;

  private static geometry: BufferGeometry | undefined;
  static getGeometry() {
    if (!Buffers.geometry) {
      const csg = new Evaluator();
      const material = Buffers.getMaterial();
      const base = new Brush(new BoxGeometry(2, 2, 2), material[0]);
      let brush = base;

      const opening = new Brush(new BoxGeometry(1.5, 1.5, 0.5), material[1]);
      connectors.forEach(({ position, rotation }) => {
        opening.position.copy(position);
        opening.rotation.y = rotation || 0;
        opening.updateMatrixWorld();
        brush = csg.evaluate(brush, opening, SUBTRACTION);
      });

      Buffers.geometry = mergeVertices(brush.geometry);
      Buffers.geometry.computeBoundingSphere();
    }
    return Buffers.geometry;
  }

  static getMaterial() {
    return ContainerMaterials;
  }

  constructor(physics: Physics) {
    super(
      {
        collider: Buffers.getCollider(),
        geometry: Buffers.getGeometry(),
        material: Buffers.getMaterial(),
      },
      physics
    );
  }

  create(position: Vector3, rotation: number, withCost: boolean = true) {
    return super.addInstance(
      new Buffer(Buffers.getConnectors(), position, rotation),
      withCost
    );
  }
}

export default Buffers;
