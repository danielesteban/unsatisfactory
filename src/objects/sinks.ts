import RAPIER from '@dimforge/rapier3d-compat';
import {
  BoxGeometry,
  CylinderGeometry,
  BufferGeometry,
  MeshStandardMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ADDITION, SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
import { PoweredContainer } from '../core/container';
import Instances from '../core/instances';
import Physics from '../core/physics';
import { Item, Sinking } from './items';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/rust_coarse_01_diff_1k.webp';
import NormalMap from '../textures/rust_coarse_01_nor_gl_1k.webp';
import RoughnessMap from '../textures/rust_coarse_01_rough_1k.webp';
import Achievements from '../ui/stores/achievements';

export class Sink extends PoweredContainer<
  {
    type: 'points';
    count: number;
  }
> {
  private points: number;
  constructor(position: Vector3, rotation: number) {
    super(position, rotation, 0, 100);
    this.points = 0;
  }

  override canInput() {
    return this.enabled && this.powered;
  }

  override input(item: Item) {
    this.setPoints(
      this.points + (Sinking[item] || 1)
    );
    Achievements.complete('points');
  }

  override output() {
    return Item.none;
  }

  override getConnector(direction: Vector3, offset: Vector3) {
    return this.position.clone().addScaledVector(direction, 1.5).add(offset);
  }

  getPoints() {
    return this.points;
  }

  setPoints(count: number) {
    this.points = count;
    this.dispatchEvent({ type: 'points', count });
  }

  override serialize() {
    const { points } = this;
    return [
      ...super.serialize(),
      points,
    ];
  }
}

class Sinks extends Instances<Sink> {
  private static collider: RAPIER.ColliderDesc | undefined;
  static getCollider() {
    if (!Sinks.collider) {
      Sinks.collider = RAPIER.ColliderDesc.cuboid(2, 2, 2);
    }
    return Sinks.collider;
  }

  private static geometry: BufferGeometry | undefined;
  static getGeometry() {
    if (!Sinks.geometry) {
      const csgEvaluator = new Evaluator();
      const base = new Brush(new BoxGeometry(4, 4, 4));
      const opening = new Brush(new BoxGeometry(1.5, 1.5, 0.5));
      let brush: Brush = base;
      ([
        [new Vector3(0, 0, 2), 0],
        [new Vector3(0, 0, -2), 0],
        [new Vector3(2, 0, 0), Math.PI * 0.5],
        [new Vector3(-2, 0, 0), Math.PI * 0.5],
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
      connector.position.copy(pole.position).add(new Vector3(0, 0.375, 0));
      connector.updateMatrixWorld();
      brush = csgEvaluator.evaluate(brush, connector, ADDITION);
      Sinks.geometry = mergeVertices(brush.geometry);
      Sinks.geometry.computeBoundingSphere();
    }
    return Sinks.geometry;
  }

  private static material: MeshStandardMaterial | undefined;
  static getMaterial() {
    if (!Sinks.material) {
      const material = new MeshStandardMaterial({
        map: loadTexture(DiffuseMap),
        normalMap: loadTexture(NormalMap),
        roughnessMap: loadTexture(RoughnessMap),
      });
      material.map!.anisotropy = 16;
      material.map!.colorSpace = SRGBColorSpace;
      Sinks.material = material;
    }
    return Sinks.material;
  }

  constructor(physics: Physics) {
    super(Sinks.getCollider(), Sinks.getGeometry(), Sinks.getMaterial(), physics);
  }

  create(position: Vector3, rotation: number) {
    return super.addInstance(new Sink(position, rotation));
  }
}

export default Sinks;
