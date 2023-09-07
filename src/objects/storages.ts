import RAPIER from '@dimforge/rapier3d-compat';
import {
  BoxGeometry,
  BufferGeometry,
  Vector3,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
import Container, { Connectors, ConnectorsCSG } from '../core/container';
import { Brush as BuildingType, Building, Item } from '../core/data';
import Instances from '../core/instances';
import Inventory from '../core/inventory';
import { ContainerMaterials } from '../core/materials';
import Physics from '../core/physics';
import InventoryStore from '../ui/stores/inventory';

export class Storage extends Container {
  private readonly inventory: Inventory;

  constructor(connectors: Connectors, position: Vector3, rotation: number) {
    super(connectors, position, rotation);
    this.inventory = new Inventory(20, 100);
  }

  getInventory() {
    return this.inventory;
  }

  setInventory(serialized: [Item, number][]) {
    this.inventory.deserialize(serialized);
  }

  override dispose() {
    const { inventory } = this;
    inventory.serialize().forEach(([item, count]) => (
      InventoryStore.input(item, count)
    ));
  }

  override acceptsInput(item: Item) {
    return this.inventory.canInput(item);
  }

  override canInput() {
    return !this.inventory.isFull();
  }

  override input(item: Item) {
    this.inventory.input(item);
  }
  
  override canOutput() {
    return !this.inventory.isEmpty();
  }

  override output() {
    return this.inventory.outputLast();
  }

  override serialize() {
    const inventory = this.inventory.serialize();
    return [
      ...super.serialize(),
      ...(inventory.length ? [inventory] : []),
    ];
  }
}

const connectors = [
  { position: new Vector3(2, -1, 0), rotation: Math.PI * 0.5 },
  { position: new Vector3(2, 1, 0), rotation: Math.PI * 0.5 },
  { position: new Vector3(-2, -1, 0), rotation: Math.PI * -0.5 },
  { position: new Vector3(-2, 1, 0), rotation: Math.PI * -0.5 },
];

class Storages extends Instances<Storage> {
  private static collider: RAPIER.ColliderDesc | undefined;
  static getCollider() {
    if (!Storages.collider) {
      Storages.collider = RAPIER.ColliderDesc.cuboid(2, 2, 1);
    }
    return Storages.collider;
  }

  private static connectors: Connectors | undefined;
  static getConnectors() {
    if (!Storages.connectors) {
      Storages.connectors = new Connectors(connectors);
    }
    return Storages.connectors;
  }

  protected static override readonly cost = Building[BuildingType.storage]!;

  private static geometry: BufferGeometry | undefined;
  static getGeometry() {
    if (!Storages.geometry) {
      const csg = new Evaluator();
      const material = Storages.getMaterial();
      const base = new Brush(new BoxGeometry(4, 4, 2), material[0]);
      let brush: Brush = base;

      brush = ConnectorsCSG(csg, brush, connectors, material[1]);
      const stripe = new Brush(new BoxGeometry(0.25, 3.5, 0.25), material[1]);
      ([
        new Vector3(0, 0, 0.875),
        new Vector3(0, 0, -0.875),
      ]).forEach((position) => {
        for (let i = 0; i < 2; i ++) {
          stripe.position.copy(position);
          stripe.position.x += 0.625 * (i == 0 ? 1 : -1);
          stripe.updateMatrixWorld();
          brush = csg.evaluate(brush, stripe, SUBTRACTION);
        }
      });

      Storages.geometry = mergeVertices(brush.geometry);
      Storages.geometry.computeBoundingSphere();
    }
    return Storages.geometry;
  }

  static getMaterial() {
    return ContainerMaterials;
  }

  constructor(physics: Physics) {
    super(
      {
        collider: Storages.getCollider(),
        geometry: Storages.getGeometry(),
        material: Storages.getMaterial(),
      },
      physics
    );
  }

  create(position: Vector3, rotation: number, withCost: boolean = true) {
    return super.addInstance(
      new Storage(Storages.getConnectors(), position, rotation),
      withCost
    );
  }
}

export default Storages;
