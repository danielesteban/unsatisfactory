import RAPIER from '@dimforge/rapier3d-compat';
import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Object3D,
  PositionalAudio,
  Vector3,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ADDITION, SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
import { Connectors, ConnectorsCSG, WireConnectorCSG } from '../core/container';
import { Brush as BuildingType, Building, Item, Generation } from '../core/data';
import GeneratorBase from '../core/generator';
import Instances, { Instance } from '../core/instances';
import { ContainerMaterials } from '../core/materials';
import Physics from '../core/physics';
import SFX from '../core/sfx';
import Inventory from '../ui/stores/inventory';

export class Generator extends GeneratorBase<
{ type: 'buffer'; }
| { type: 'progress'; }
> {
  private static readonly bufferEvent: { type: 'buffer' } = { type: 'buffer' };
  private static readonly progressEvent: { type: 'progress' } = { type: 'progress' };

  private static readonly maxBuffer: number = 100;
  private buffer: number;
  private readonly count: number;
  private readonly item: Exclude<Item, Item.none>;
  private readonly rate: number;
  private readonly sfx: SFX;
  private sound?: PositionalAudio;
  private tick: number;

  constructor(connectors: Connectors, position: Vector3, rotation: number, item: Exclude<Item, Item.none>, sfx: SFX) {
    const { count, rate, power } = Generation[item] || { count: 0, rate: 0, power: 0 };
    super(connectors, position, rotation, power);
    this.buffer = 0;
    this.count = count;
    this.item = item;
    this.rate = rate;
    this.sfx = sfx;
    this.tick = 0;
  }

  getInputBuffer() {
    const { buffer } = this;
    return buffer;
  }

  getFromInputBuffer(count: number) {
    const c = Math.min(count, this.buffer);
    this.buffer -= c;
    this.dispatchEvent(Generator.bufferEvent);
    return c;
  }

  addToInputBuffer(count: number) {
    const c = Math.min(count, Generator.maxBuffer - this.buffer);
    this.buffer += c;
    this.dispatchEvent(Generator.bufferEvent);
    return count - c;
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

  getRate() {
    return this.rate;
  }

  override acceptsInput(item: Item) {
    const { buffer, enabled, item: input } = this;
    return enabled && item === input && buffer < Generator.maxBuffer;
  }

  override canInput() {
    const { buffer, enabled } = this;
    return (
      enabled && buffer < Generator.maxBuffer
    );
  }

  override input() {
    this.buffer++;
    this.dispatchEvent(Generator.bufferEvent);
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

  process() {
    const { buffer, count, enabled, generating, position, rate, sfx } = this;
    if (!enabled) {
      return false;
    }
    if (this.tick === 0) {
      if (buffer < count) {
        if (generating) {
          this.setGenerating(false);
        }
        return false;
      }
      this.buffer -= count;
      this.dispatchEvent(Generator.bufferEvent);
      if (!generating) this.setGenerating(true);
    }
    if (++this.tick < rate) {
      this.dispatchEvent(Generator.progressEvent);
      return false;
    }
    this.tick = 0;
    if (!this.sound) {
      this.sound = sfx.playAt(
        'machine',
        position,
        Math.random() * 0.1,
        (Math.random() - 0.5) * 1200,
        0.2,
        () => {
          this.sound = undefined;
        }
      );
    }
    this.dispatchEvent(Generator.progressEvent);
    return true;
  }

  setBuffer(serialized: number) {
    this.buffer = serialized;
  }

  setTick(tick: number) {
    this.tick = tick;
  }

  override serialize() {
    const { buffer, tick } = this;
    return [
      ...super.serialize(),
      tick,
      ...(buffer > 0 ? [buffer] : []),
    ];
  }

  private static readonly wireConnectorOffset: Vector3 = new Vector3(2, 0, 0);
  override getWireConnector() {
    return Generator.wireConnectorOffset.clone()
      .applyQuaternion(Instance.getQuaternion(this))
      .add(this.position)
      .addScaledVector(Object3D.DEFAULT_UP, 0.5);
  }
}

const connectors = [
  { position: new Vector3(3, -3, 0), rotation: Math.PI * 0.5 },
];

class Generators extends Instances<Generator> {
  private static collider: RAPIER.ColliderDesc[] | undefined;
  static getCollider() {
    if (!Generators.collider) {
      Generators.collider = [
        RAPIER.ColliderDesc.cuboid(1, 2, 1)
          .setTranslation(2, -2, 0),
        RAPIER.ColliderDesc.cuboid(2, 1, 1)
          .setTranslation(-1, -3, 0),
        RAPIER.ColliderDesc.cuboid(1.5, 4, 0.5)
          .setTranslation(-1, 2, 0),
      ];
    }
    return Generators.collider;
  }

  private static connectors: Connectors | undefined;
  static getConnectors() {
    if (!Generators.connectors) {
      Generators.connectors = new Connectors(connectors);
    }
    return Generators.connectors;
  }

  protected static override readonly cost = Building[BuildingType.generator]!;

  private static geometry: BufferGeometry | undefined;
  static getGeometry() {
    if (!Generators.geometry) {
      const csg = new Evaluator();
      const material = Generators.getMaterial();
      const base = new Brush(new BoxGeometry(6, 4, 2), material[0]);
      base.position.set(0, -2, 0);
      base.updateMatrixWorld();
      const cut = new Brush(new BoxGeometry(4, 2, 2), material[0]);
      cut.position.set(-1, -1, 0);
      cut.updateMatrixWorld();
      let brush = csg.evaluate(base, cut, SUBTRACTION);

      const chimneyOut = new Brush(new CylinderGeometry(0.4, 0.55, 8), material[0]);
      const chimneyIn = new Brush(new CylinderGeometry(0.3, 0.3, 4), material[0]);
      chimneyIn.position.set(0, 2.1, 0);
      chimneyIn.updateMatrixWorld();
      const chimney = csg.evaluate(chimneyOut, chimneyIn, SUBTRACTION);
      chimney.position.set(0, 0.001, 0);
      chimney.updateMatrixWorld();
      brush = csg.evaluate(brush, chimney, ADDITION);
      chimney.position.set(-1, 2, 0);
      chimney.updateMatrixWorld();
      brush = csg.evaluate(brush, chimney, ADDITION);
      chimney.position.set(-2, 1, 0);
      chimney.updateMatrixWorld();
      brush = csg.evaluate(brush, chimney, ADDITION);

      brush = WireConnectorCSG(csg, brush, new Vector3(2, 0.125, 0), material[0], material[1]);
      brush = ConnectorsCSG(csg, brush, connectors, material[1]);
      const stripe = new Brush(new BoxGeometry(5.5, 0.25, 0.25), material[1]);
      ([
        new Vector3(0, -3, 0.875),
        new Vector3(0, -3, -0.875),
      ]).forEach((position) => {
        for (let i = 0; i < 2; i ++) {
          stripe.position.copy(position);
          stripe.position.y += 0.625 * (i == 0 ? 1 : -1);
          stripe.updateMatrixWorld();
          brush = csg.evaluate(brush, stripe, SUBTRACTION);
        }
      });

      Generators.geometry = mergeVertices(brush.geometry);
      Generators.geometry.computeBoundingSphere();
    }
    return Generators.geometry;
  }

  static getMaterial() {
    return ContainerMaterials;
  }

  private readonly sfx: SFX;

  constructor(physics: Physics, sfx: SFX) {
    super(
      {
        collider: Generators.getCollider(),
        geometry: Generators.getGeometry(),
        material: Generators.getMaterial(),
      },
      physics
    );
    this.sfx = sfx;
  }

  create(position: Vector3, rotation: number, withCost: boolean = true) {
    const { sfx } = this;
    const generator = super.addInstance(
      new Generator(Generators.getConnectors(), position, rotation, Item.coal, sfx),
      withCost
    );
    return generator;
  }
}

export default Generators;
