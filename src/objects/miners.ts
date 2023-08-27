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
import { Belt } from './belts';
import { Item, Mining } from './items';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/rust_coarse_01_diff_1k.webp';
import NormalMap from '../textures/rust_coarse_01_nor_gl_1k.webp';
import RoughnessMap from '../textures/rust_coarse_01_rough_1k.webp';
import Achievements, { Achievement } from '../ui/stores/achievements';

export class Miner extends PoweredContainer {
  private readonly item: Item;
  private readonly purity: number;
  private readonly rate: number;
  private readonly sfx: SFX;
  private sound?: PositionalAudio;
  private static readonly buffer: number = 4;
  private count: number;
  private outputBelt: number;
  private tick: number;

  constructor(parent: Miners, connectors: Connectors, position: Vector3, rotation: number, item: Item, purity: number, sfx: SFX) {
    const { consumption, rate } = Mining[item] || { consumption: 0, rate: 0 };
    super(parent, connectors, position, rotation, consumption / purity);
    this.item = item;
    this.purity = purity;
    this.rate = rate * purity;
    this.sfx = sfx;
    this.count = 0;
    this.outputBelt = 0;
    this.tick = 0;
  }

  getItem() {
    return this.item;
  }

  getPurity() {
    return this.purity;
  }

  getRate() {
    return this.rate;
  }

  override dispose() {
    if (this.sound?.isPlaying) {
      this.sound.stop();
    }
  }

  override setPowered(status: boolean) {
    super.setPowered(status);
    if (status) {
      Achievements.complete(Achievement.power);
    }
  }

  private getOutput() {
    const { count, item } = this;
    if (count > 0) {
      this.count--;
      return item;
    }
    return Item.none;
  }

  override output(belt: Belt) {
    const { belts: { output: belts }, outputBelt } = this;
    if (belts.length <= 1) {
      return this.getOutput();
    }
    if (
      outputBelt < belts.length
      && belts[outputBelt] !== belt
      && belts[outputBelt].canInput()
    ) {
      return Item.none;
    }
    const output = this.getOutput();
    if (output !== Item.none) {
      this.outputBelt = (belts.indexOf(belt) + 1) % belts.length;
    }
    return output;
  }

  process() {
    const { count, enabled, position, powered, rate, sfx } = this;
    if (
      !enabled
      || !powered
      || count >= Miner.buffer
      || ++this.tick < rate
    ) {
      return false;
    }
    this.tick = 0;
    if (!this.sound?.isPlaying) {
      this.sound = sfx.playAt('machine', position, Math.random() * 0.1, (Math.random() - 0.5) * 1200);
    }
    this.count++;
    return true;
  }

  override serialize() {
    const { item, purity } = this;
    return [
      ...super.serialize(),
      item,
      purity,
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

  create(position: Vector3, rotation: number, item: Item, purity: number) {
    const { sfx } = this;
    const instance = super.addInstance(
      new Miner(this, Miners.getConnectors(), position, rotation, item, purity, sfx)
    );
    return instance;
  }
}

export default Miners;
