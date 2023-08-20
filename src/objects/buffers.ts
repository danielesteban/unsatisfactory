import RAPIER from '@dimforge/rapier3d-compat';
import {
  BoxGeometry,
  BufferGeometry,
  MeshStandardMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
import Container from '../core/container';
import Instances from '../core/instances';
import Physics from '../core/physics';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/rust_coarse_01_diff_1k.webp';
import NormalMap from '../textures/rust_coarse_01_nor_gl_1k.webp';
import RoughnessMap from '../textures/rust_coarse_01_rough_1k.webp';

export class Buffer extends Container {
  constructor(position: Vector3, rotation: number) {
    super(position, rotation, 10);
  }
}

class Buffers extends Instances<Buffer> {
  private static collider: RAPIER.ColliderDesc | undefined;
  static getCollider() {
    if (!Buffers.collider) {
      Buffers.collider = RAPIER.ColliderDesc.cuboid(1, 1, 1);
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
      Buffers.geometry = mergeVertices(brush.geometry);
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

  constructor(physics: Physics) {
    super(Buffers.getCollider(), Buffers.getGeometry(), Buffers.getMaterial(), physics);
  }

  create(position: Vector3, rotation: number) {
    return super.addInstance(new Buffer(position, rotation));
  }
}

export default Buffers;
