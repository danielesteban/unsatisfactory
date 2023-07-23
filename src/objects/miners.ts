import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Mesh,
  MeshStandardMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { ADDITION, SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
import Instances from '../core/instances';
import { PoweredContainer } from '../core/container';
import { Item } from './items';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/rust_coarse_01_diff_1k.jpg';
import NormalMap from '../textures/rust_coarse_01_nor_gl_1k.jpg';
import RoughnessMap from '../textures/rust_coarse_01_rough_1k.jpg';

export class Miner extends PoweredContainer {
  private readonly item: Item;
  private tick: number;
  private rate: number;

  constructor(position: Vector3, rotation: number, item: Item) {
    super(position, rotation, 0, 10);
    this.item = item;
    this.tick = 0;
    this.rate = 3;
  }

  override output() {
    const { enabled, item, powered, rate } = this;
    if (!enabled || !powered || ++this.tick < rate) {
      return Item.none;
    }
    this.tick = 0;
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
  static setupCollider() {
    Miners.collider = new BoxGeometry(2, 4, 2);
    Miners.collider.computeBoundingSphere();
  }

  private static geometry: BufferGeometry | undefined;
  static setupGeometry() {
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

  private static material: MeshStandardMaterial | undefined;
  static setupMaterial() {
    Miners.material = new MeshStandardMaterial({
      map: loadTexture(DiffuseMap),
      normalMap: loadTexture(NormalMap),
      roughnessMap: loadTexture(RoughnessMap),
    });
    Miners.material.map!.anisotropy = 16;
    Miners.material.map!.colorSpace = SRGBColorSpace;
    return Miners.material;
  }

  constructor() {
    if (!Miners.collider) {
      Miners.setupCollider();
    }
    if (!Miners.geometry) {
      Miners.setupGeometry();
    }
    if (!Miners.material) {
      Miners.setupMaterial();
    }
    super(Miners.geometry!, Miners.material!, Miners.collider!);
  }

  create(position: Vector3, rotation: number, item: Item) {
    return super.addInstance(new Miner(position, rotation, item));
  }
}

export default Miners;
