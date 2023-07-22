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

export class Fabricator extends PoweredContainer {
  private tick: number;
  private rate: number;

  constructor(position: Vector3, rotation: number) {
    super(position, rotation, 1, 10);
    this.tick = 0;
    this.rate = 1;
  }

  private static connectorOffset: Vector3 = new Vector3(0, -1, 0);
  override getConnector(direction: Vector3, offset: Vector3) {
    return this.position.clone()
      .add(Fabricator.connectorOffset)
      .addScaledVector(direction, 1.75)
      .add(offset);
  }

  private static fabricate(item: Item) {
    switch (item) {
      default:
        return item;
      case Item.ore:
        return Item.capsule;
      case Item.capsule:
        return Item.cylinder;
      case Item.cylinder:
        return Item.box;
    }
  }

  override output() {
    const { enabled, items, powered, rate } = this;
    if (!enabled || !powered || ++this.tick < rate) {
      return Item.none;
    }
    this.tick = 0;
    return Fabricator.fabricate(items.pop() || Item.none);
  }

  override getWireConnector(): Vector3 {
    return this.position.clone().addScaledVector(PoweredContainer.worldUp, 2.5);
  }
};

class Fabricators extends Instances<Fabricator> {
  private static collider: BufferGeometry | undefined;
  static setupCollider() {
    Fabricators.collider = new BoxGeometry(4, 4, 2);
    Fabricators.collider.computeBoundingSphere();
  }

  private static geometry: BufferGeometry | undefined;
  static setupGeometry() {
    const csgEvaluator = new Evaluator();
    const base = new Brush(new BoxGeometry(4, 4, 2));
    const opening = new Brush(new BoxGeometry(1.5, 1.5, 0.5));
    let brush: Brush = base;
    ([
      [new Vector3(2, -1, 0), Math.PI * 0.5],
      [new Vector3(-2, -1, 0), Math.PI * 0.5],
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
    Fabricators.geometry = (brush! as Mesh).geometry;
    Fabricators.geometry.computeBoundingSphere();
  }

  private static material: MeshStandardMaterial | undefined;
  static setupMaterial() {
    Fabricators.material = new MeshStandardMaterial({
      map: loadTexture(DiffuseMap),
      normalMap: loadTexture(NormalMap),
      roughnessMap: loadTexture(RoughnessMap),
    });
    Fabricators.material.map!.anisotropy = 16;
    Fabricators.material.map!.colorSpace = SRGBColorSpace;
    return Fabricators.material;
  }

  constructor() {
    if (!Fabricators.collider) {
      Fabricators.setupCollider();
    }
    if (!Fabricators.geometry) {
      Fabricators.setupGeometry();
    }
    if (!Fabricators.material) {
      Fabricators.setupMaterial();
    }
    super(Fabricators.geometry!, Fabricators.material!, Fabricators.collider!);
  }

  create(position: Vector3, rotation: number) {
    return super.addInstance(new Fabricator(position, rotation));
  }
}

export default Fabricators;
