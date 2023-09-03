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
import Physics from '../core/physics';
import { Item } from './items';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/rust_coarse_01_diff_1k.webp';
import NormalMap from '../textures/rust_coarse_01_nor_gl_1k.webp';
import RoughnessMap from '../textures/rust_coarse_01_rough_1k.webp';
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
  static override readonly cost: typeof Instances.cost = [
    { item: Item.ironPlate, count: 5 },
  ];

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

  private static geometry: BufferGeometry | undefined;
  static getGeometry() {
    if (!Buffers.geometry) {
      const csgEvaluator = new Evaluator();
      const base = new Brush(new BoxGeometry(2, 2, 2));
      const opening = new Brush(new BoxGeometry(1.5, 1.5, 0.5));
      let brush: Brush = base;
      connectors.forEach(({ position, rotation }) => {
        opening.position.copy(position);
        opening.rotation.y = rotation || 0;
        opening.updateMatrixWorld();
        brush = csgEvaluator.evaluate(brush, opening, SUBTRACTION);
      });
      Buffers.geometry = mergeVertices(brush.geometry);
      Buffers.geometry.computeBoundingSphere();
    }
    return Buffers.geometry;
  }

  private static material: MeshStandardMaterial | undefined;
  static getMaterial() {
    if (!Buffers.material) {
      const material = new MeshStandardMaterial({
        map: loadTexture(DiffuseMap),
        normalMap: loadTexture(NormalMap),
        roughnessMap: loadTexture(RoughnessMap),
      });
      material.map!.anisotropy = 16;
      material.map!.colorSpace = SRGBColorSpace;
      Buffers.material = material;
    }
    return Buffers.material;
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
