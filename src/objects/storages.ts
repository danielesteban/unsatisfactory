import RAPIER from '@dimforge/rapier3d-compat';
import {
  BoxGeometry,
  BufferGeometry,
  MeshStandardMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
import Container, { Connectors } from '../core/container';
import Instances from '../core/instances';
import Inventory from '../core/inventory';
import Physics from '../core/physics';
import { Item } from './items';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/rust_coarse_01_diff_1k.webp';
import NormalMap from '../textures/rust_coarse_01_nor_gl_1k.webp';
import RoughnessMap from '../textures/rust_coarse_01_rough_1k.webp';
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
  static override readonly cost: typeof Instances.cost = [
    { item: Item.ironPlate, count: 10 },
    { item: Item.ironRod, count: 10 },
  ];

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

  private static geometry: BufferGeometry | undefined;
  static getGeometry() {
    if (!Storages.geometry) {
      const csgEvaluator = new Evaluator();
      const base = new Brush(new BoxGeometry(4, 4, 2));
      const opening = new Brush(new BoxGeometry(1.5, 1.5, 0.5));
      const stripe = new Brush(new BoxGeometry(0.25, 3.5, 0.25));
      let brush: Brush = base;
      connectors.forEach(({ position, rotation }) => {
        opening.position.copy(position);
        opening.rotation.y = rotation;
        opening.updateMatrixWorld();
        brush = csgEvaluator.evaluate(brush, opening, SUBTRACTION);
      });
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
      Storages.geometry = mergeVertices(brush.geometry);
      Storages.geometry.computeBoundingSphere();
    }
    return Storages.geometry;
  }

  private static material: MeshStandardMaterial | undefined;
  static getMaterial() {
    if (!Storages.material) {
      const material = new MeshStandardMaterial({
        map: loadTexture(DiffuseMap),
        normalMap: loadTexture(NormalMap),
        roughnessMap: loadTexture(RoughnessMap),
      });
      material.map!.anisotropy = 16;
      material.map!.colorSpace = SRGBColorSpace;
      Storages.material = material;
    }
    return Storages.material;
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
