import {
  BoxGeometry,
  BufferGeometry,
  Mesh,
  MeshStandardMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
import Instances from '../core/instances';
import Container from './container';
import { Item } from './items';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/rust_coarse_01_diff_1k.jpg';
import NormalMap from '../textures/rust_coarse_01_nor_gl_1k.jpg';
import RoughnessMap from '../textures/rust_coarse_01_rough_1k.jpg';

class Miner extends Container {
  private readonly item: Item;
  private tick: number;

  constructor(position: Vector3, item: Item) {
    super(position, 0);
    this.tick = 0;
    this.item = item;
  }

  override output() {
    const { items, item } = this;
    if (this.tick++ < 1) {
      return Item.none;
    }
    this.tick = 0;
    return items.pop() || item;
  }

  private static bottomConnectorOffset: Vector3 = new Vector3(0, -1, 0);
  private static topConnectorOffset: Vector3 = new Vector3(0, 1, 0);
  private static worldUp: Vector3 = new Vector3(0, 1, 0);
  override getConnector(direction: Vector3, offset: Vector3) {
    return this.position.clone()
      .add(direction.dot(Miner.worldUp) <= 0 ? Miner.bottomConnectorOffset : Miner.topConnectorOffset)
      .addScaledVector(direction, 0.75)
      .add(offset);
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

  create(position: Vector3, item: Item) {
    return super.addInstance(new Miner(position, item));
  }
}

export default Miners;
