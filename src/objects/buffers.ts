import {
  BaseEvent,
  BoxGeometry,
  BufferGeometry,
  Mesh,
  MeshStandardMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
import Instances from '../core/instances';
import Container from '../core/container';
import { Item } from './items';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/rust_coarse_01_diff_1k.jpg';
import NormalMap from '../textures/rust_coarse_01_nor_gl_1k.jpg';
import RoughnessMap from '../textures/rust_coarse_01_rough_1k.jpg';

export type BufferEvent = BaseEvent & (
  {
    type: 'sink';
    status: boolean;
  }
);

export class Buffer extends Container<BufferEvent> {
  private sink: boolean;

  constructor(position: Vector3, rotation: number) {
    super(position, rotation, 3);
    this.sink = false;
  }

  override canInput(item: Item) {
    return this.sink ? true : super.canInput(item);
  }

  override input(item: Item) {
    if (!this.sink) {
      super.input(item);
    }
  }

  isSink() {
    return this.sink;
  }

  setSink(status: boolean) {
    this.sink = status;
    this.dispatchEvent({ type: 'sink', status });
  }
};

class Buffers extends Instances<Buffer> {
  private static collider: BufferGeometry | undefined;
  static setupCollider() {
    Buffers.collider = new BoxGeometry(2, 2, 2);
    Buffers.collider.computeBoundingSphere();
  }

  private static geometry: BufferGeometry | undefined;
  static setupGeometry() {
    const csgEvaluator = new Evaluator();
    const base = new Brush(new BoxGeometry(2, 2, 2));
    const opening = new Brush(new BoxGeometry(1.5, 1.5, 0.5));
    let brush: Brush = base;
    ([
      [new Vector3(0, 0, 1), 0],
      [new Vector3(0, 0, -1), 0],
      [new Vector3(1, 0, 0), Math.PI * 0.5],
      [new Vector3(-1, 0, 0), Math.PI * 0.5],
    ] as [Vector3, number][]).forEach(([position, rotation]) => {
      opening.position.copy(position);
      opening.rotation.y = rotation;
      opening.updateMatrixWorld();
      brush = csgEvaluator.evaluate(brush, opening, SUBTRACTION);
    });
    Buffers.geometry = (brush! as Mesh).geometry;
    Buffers.geometry.computeBoundingSphere();
  }

  private static material: MeshStandardMaterial | undefined;
  static setupMaterial() {
    Buffers.material = new MeshStandardMaterial({
      map: loadTexture(DiffuseMap),
      normalMap: loadTexture(NormalMap),
      roughnessMap: loadTexture(RoughnessMap),
    });
    Buffers.material.map!.anisotropy = 16;
    Buffers.material.map!.colorSpace = SRGBColorSpace;
    return Buffers.material;
  }

  constructor() {
    if (!Buffers.collider) {
      Buffers.setupCollider();
    }
    if (!Buffers.geometry) {
      Buffers.setupGeometry();
    }
    if (!Buffers.material) {
      Buffers.setupMaterial();
    }
    super(Buffers.geometry!, Buffers.material!, Buffers.collider!);
  }

  create(position: Vector3, rotation: number) {
    return super.addInstance(new Buffer(position, rotation));
  }
}

export default Buffers;
