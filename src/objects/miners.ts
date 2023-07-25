import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Mesh,
  MeshStandardMaterial,
  PositionalAudio,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { ADDITION, SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
import Instances from '../core/instances';
import { PoweredContainer } from '../core/container';
import SFX from '../core/sfx';
import { Item } from './items';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/rust_coarse_01_diff_1k.jpg';
import NormalMap from '../textures/rust_coarse_01_nor_gl_1k.jpg';
import RoughnessMap from '../textures/rust_coarse_01_rough_1k.jpg';

export class Miner extends PoweredContainer {
  private readonly item: Item;
  private rate: number;
  private readonly sfx: SFX;
  private sound?: PositionalAudio;
  private tick: number;

  constructor(position: Vector3, rotation: number, item: Item, sfx: SFX) {
    super(position, rotation, 0, 10);
    this.item = item;
    this.rate = 3;
    this.sfx = sfx;
    this.tick = 0;
  }

  override dispose() {
    if (this.sound?.isPlaying) {
      this.sound.stop();
    }
  }

  override output() {
    const { enabled, item, position, powered, rate, sfx } = this;
    if (!enabled || !powered || ++this.tick < rate) {
      return Item.none;
    }
    this.tick = 0;
    if (!this.sound?.isPlaying) {
      this.sound = sfx.playAt('machine', position, Math.random() * 0.1, (Math.random() - 0.5) * 1200);
    }
    return item;
  }

  private static connectorOffset: Vector3 = new Vector3(0, -1, 0);
  override getConnector(direction: Vector3, offset: Vector3) {
    return this.position.clone()
      .add(Miner.connectorOffset)
      .addScaledVector(direction, 0.75)
      .add(offset);
  }

  override getWireConnector(): Vector3 {
    return this.position.clone().addScaledVector(PoweredContainer.worldUp, 2.5);
  }

  override serialize() {
    const { item } = this;
    return [
      ...super.serialize(),
      item,
    ];
  }
};

class Miners extends Instances<Miner> {
  private static collider: BufferGeometry | undefined;
  static getCollider() {
    if (!Miners.collider) {
      Miners.collider = new BoxGeometry(2, 4, 2);
      Miners.collider.computeBoundingSphere();
    }
    return Miners.collider;
  }

  private static geometry: BufferGeometry | undefined;
  static getGeometry() {
    if (!Miners.geometry) {
      const csgEvaluator = new Evaluator();
      const base = new Brush(new BoxGeometry(2, 4, 2));
      const opening = new Brush(new BoxGeometry(1.5, 1.5, 0.5));
      let brush: Brush = base;
      ([
        [new Vector3(0, -1, 1), 0],
        [new Vector3(0, -1, -1), 0],
        [new Vector3(1, -1, 0), Math.PI * 0.5],
        [new Vector3(-1, -1, 0), Math.PI * 0.5],
      ] as [Vector3, number][]).forEach(([position, rotation]) => {
        opening.position.copy(position);
        opening.rotation.y = rotation;
        opening.updateMatrixWorld();
        brush = csgEvaluator.evaluate(brush, opening, SUBTRACTION);
      });
      const pole = new Brush(new CylinderGeometry(0.125, 0.125, 0.25));
      pole.position.set(0, 2.125, 0);
      pole.updateMatrixWorld();
      brush = csgEvaluator.evaluate(brush, pole, ADDITION);
      const connector = new Brush(new CylinderGeometry(0.25, 0.25, 0.5));
      connector.position.set(0, 2.5, 0);
      connector.updateMatrixWorld();
      brush = csgEvaluator.evaluate(brush, connector, ADDITION);
      Miners.geometry = (brush! as Mesh).geometry;
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

  constructor(sfx: SFX) {
    super(Miners.getGeometry(), Miners.getMaterial(), Miners.getCollider());
    this.sfx = sfx;
  }

  create(position: Vector3, rotation: number, item: Item) {
    const { sfx } = this;
    const instance = super.addInstance(
      new Miner(position, rotation, item, sfx)
    );
    return instance;
  }
}

export default Miners;
