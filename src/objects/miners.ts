import RAPIER from '@dimforge/rapier3d-compat';
import {
  BoxGeometry,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  MeshStandardMaterial,
  PositionalAudio,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ADDITION, SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
import { Connectors, PoweredContainer } from '../core/container';
import Instances from '../core/instances';
import Physics from '../core/physics';
import SFX from '../core/sfx';
import { Item, Mining } from './items';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/rust_coarse_01_diff_1k.webp';
import NormalMap from '../textures/rust_coarse_01_nor_gl_1k.webp';
import RoughnessMap from '../textures/rust_coarse_01_rough_1k.webp';
import Achievements, { Achievement } from '../ui/stores/achievements';
import Inventory from '../ui/stores/inventory';

export class Miner extends PoweredContainer<
  { type: 'buffer'; }
  | { type: 'progress'; }
> {
  private static readonly bufferEvent: { type: 'buffer' } = { type: 'buffer' };
  private static readonly progressEvent: { type: 'progress' } = { type: 'progress' };

  private static readonly maxBuffer: number = 100;
  private buffer: number;
  private readonly count: number;
  private readonly item: Exclude<Item, Item.none>;
  private readonly purity: number;
  private readonly rate: number;
  private readonly sfx: SFX;
  private sound?: PositionalAudio;
  private tick: number;

  constructor(connectors: Connectors, position: Vector3, rotation: number, item: Exclude<Item, Item.none>, purity: number, sfx: SFX) {
    const { consumption, count, rate } = Mining[item] || { consumption: 0, count: 0, rate: 0 };
    super(connectors, position, rotation, consumption / purity);
    this.buffer = 0;
    this.count = count / purity;
    this.item = item;
    this.purity = purity;
    this.rate = rate;
    this.sfx = sfx;
    this.tick = 0;
  }

  getOutputBuffer() {
    const { buffer } = this;
    return buffer;
  }

  getFromOutputBuffer(count: number) {
    const c = Math.min(count, this.buffer);
    this.buffer -= c;
    this.dispatchEvent(Miner.bufferEvent);
    return c;
  }

  getCount() {
    return this.count;
  }

  getItem() {
    return this.item;
  }

  getProgress() {
    const { rate, tick } = this;
    return tick / (rate - 1);
  }

  getPurity() {
    return this.purity;
  }

  getRate() {
    return this.rate;
  }

  override dispose() {
    const { buffer, item, sound } = this;
    if (buffer > 0) {
      Inventory.input(item, buffer);
    }
    if (sound) {
      sound.stop();
    }
  }

  override setPowered(status: boolean) {
    super.setPowered(status);
    if (status) {
      Achievements.complete(Achievement.power);
    }
  }

  override canOutput() {
    const { buffer } = this;
    return buffer > 0;
  }

  override output() {
    const { buffer, item } = this;
    if (buffer > 0) {
      this.buffer--;
      this.dispatchEvent(Miner.bufferEvent);
      return item;
    }
    return Item.none;
  }

  process() {
    const { buffer, count, enabled, position, powered, rate, sfx } = this;
    if (
      !enabled
      || !powered
      || buffer > (Miner.maxBuffer - count)
    ) {
      return false;
    }
    if (++this.tick < rate) {
      this.dispatchEvent(Miner.progressEvent);
      return false;
    }
    this.tick = 0;
    this.buffer += count;
    if (!this.sound) {
      this.sound = sfx.playAt(
        'machine',
        position,
        Math.random() * 0.1,
        (Math.random() - 0.5) * 1200,
        0.4,
        () => {
          this.sound = undefined;
        }
      );
    }
    this.dispatchEvent(Miner.bufferEvent);
    this.dispatchEvent(Miner.progressEvent);
    return true;
  }

  setBuffer(serialized: number) {
    this.buffer = serialized;
  }

  setTick(tick: number) {
    this.tick = tick;
  }

  override serialize() {
    const { buffer, item, purity, tick } = this;
    return [
      ...super.serialize(),
      item,
      purity,
      tick,
      ...(buffer > 0 ? [buffer] : []),
    ];
  }
}

const connectors = [
  { position: new Vector3(0, 0, 1) },
  { position: new Vector3(0, 0, -1), rotation: Math.PI * -1 },
  { position: new Vector3(1, 0, 0), rotation: Math.PI * 0.5 },
  { position: new Vector3(-1, 0, 0), rotation: Math.PI * -0.5 },
];

class Miners extends Instances<Miner> {
  static override readonly cost: typeof Instances.cost = [
    { item: Item.ironPlate, count: 10 },
    { item: Item.wire, count: 5 },
  ];

  private static collider: RAPIER.ColliderDesc | undefined;
  static getCollider() {
    if (!Miners.collider) {
      Miners.collider = RAPIER.ColliderDesc.cuboid(1, 2, 1);
    }
    return Miners.collider;
  }

  private static connectors: Connectors | undefined;
  static getConnectors() {
    if (!Miners.connectors) {
      Miners.connectors = new Connectors(connectors);
    }
    return Miners.connectors;
  }

  private static geometry: BufferGeometry | undefined;
  static getGeometry() {
    if (!Miners.geometry) {
      const csgEvaluator = new Evaluator();
      const base = new Brush(new BoxGeometry(2, 4, 2));
      const opening = new Brush(new BoxGeometry(1.5, 1.5, 0.5));
      const drill = new Brush(new ConeGeometry(1, 1));
      drill.geometry.rotateX(Math.PI);
      drill.geometry.translate(0, -2.5, 0);
      let brush = csgEvaluator.evaluate(base, drill, ADDITION);
      connectors.forEach(({ position, rotation }) => {
        opening.position.copy(position);
        opening.rotation.y = rotation || 0;
        opening.updateMatrixWorld();
        brush = csgEvaluator.evaluate(brush, opening, SUBTRACTION);
      });
      const pole = new Brush(new CylinderGeometry(0.125, 0.125, 0.25));
      pole.position.set(0, 2.125, 0);
      pole.updateMatrixWorld();
      brush = csgEvaluator.evaluate(brush, pole, ADDITION);
      const connector = new Brush(new CylinderGeometry(0.25, 0.25, 0.5));
      connector.position.copy(pole.position).add(new Vector3(0, 0.375, 0));
      connector.updateMatrixWorld();
      brush = csgEvaluator.evaluate(brush, connector, ADDITION);
      Miners.geometry = mergeVertices(brush.geometry);
      Miners.geometry.computeBoundingSphere();
    }
    return Miners.geometry;
  }

  private static material: MeshStandardMaterial | undefined;
  static getMaterial() {
    if (!Miners.material) {
      const material = new MeshStandardMaterial({
        map: loadTexture(DiffuseMap),
        normalMap: loadTexture(NormalMap),
        roughnessMap: loadTexture(RoughnessMap),
      });
      material.map!.anisotropy = 16;
      material.map!.colorSpace = SRGBColorSpace;
      Miners.material = material;
    }
    return Miners.material;
  }

  private readonly sfx: SFX;

  constructor(physics: Physics, sfx: SFX) {
    super(
      {
        collider: Miners.getCollider(),
        geometry: Miners.getGeometry(),
        material: Miners.getMaterial(),
      },
      physics
    );
    this.sfx = sfx;
  }

  create(position: Vector3, rotation: number, item: Item, purity: number, withCost: boolean = true) {
    const { sfx } = this;
    const instance = super.addInstance(
      new Miner(Miners.getConnectors(), position, rotation, item as Exclude<Item, Item.none>, purity, sfx),
      withCost
    );
    return instance;
  }
}

export default Miners;
