import RAPIER from '@dimforge/rapier3d-compat';
import {
  BoxGeometry,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  PositionalAudio,
  Vector3,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ADDITION, SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
import { Connectors, PoweredContainer } from '../core/container';
import { Brush as BuildingType, Building, Item, Mining } from '../core/data';
import Instances from '../core/instances';
import { ContainerMaterials } from '../core/materials';
import Physics from '../core/physics';
import SFX from '../core/sfx';
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

  protected static override readonly cost = Building[BuildingType.miner];

  private static geometry: BufferGeometry | undefined;
  static getGeometry() {
    if (!Miners.geometry) {
      const csg = new Evaluator();
      const materials = Miners.getMaterial();
      const base = new Brush(new BoxGeometry(2, 4, 2), materials[0]);
      const drill = new Brush(new ConeGeometry(1, 1), materials[0]);
      drill.geometry.rotateX(Math.PI);
      drill.geometry.translate(0, -2.5, 0);
      let brush = csg.evaluate(base, drill, ADDITION);

      const pole = new Brush(new CylinderGeometry(0.125, 0.125, 0.25), materials[1]);
      pole.position.set(0, 2.125, 0);
      pole.updateMatrixWorld();
      brush = csg.evaluate(brush, pole, ADDITION);
      const cap = new Brush(new CylinderGeometry(0.25, 0.25, 0.5), materials[0]);
      cap.position.copy(pole.position).add(new Vector3(0, 0.375, 0));
      cap.updateMatrixWorld();
      brush = csg.evaluate(brush, cap, ADDITION);

      const opening = new Brush(new BoxGeometry(1.5, 1.5, 0.5), materials[1]);
      connectors.forEach(({ position, rotation }) => {
        opening.position.copy(position);
        opening.rotation.y = rotation || 0;
        opening.updateMatrixWorld();
        brush = csg.evaluate(brush, opening, SUBTRACTION);
      });

      Miners.geometry = mergeVertices(brush.geometry);
      Miners.geometry.computeBoundingSphere();
    }
    return Miners.geometry;
  }

  static getMaterial() {
    return ContainerMaterials;
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
