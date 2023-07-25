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

  override serialize() {
    const { sink } = this;
    return [
      ...super.serialize(),
      sink ? 1 : 0,
    ];
  }
};

class Buffers extends Instances<Buffer> {
  private static collider: BufferGeometry | undefined;
  static getCollider() {
    if (!Buffers.collider) {
      Buffers.collider = new BoxGeometry(2, 2, 2);
      Buffers.collider.computeBoundingSphere();
    }
    return Buffers.collider;
  }

  private static geometry: BufferGeometry | undefined;
  static getGeometry() {
    if (!Buffers.geometry) {
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

  constructor() {
    super(Buffers.getGeometry(), Buffers.getMaterial(), Buffers.getCollider());
  }

  create(position: Vector3, rotation: number) {
    return super.addInstance(new Buffer(position, rotation));
  }
}

export default Buffers;
