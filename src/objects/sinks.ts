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
import { Connectors, PoweredContainer } from '../core/container';
import Instances from '../core/instances';
import Physics from '../core/physics';
import { Item, Sinking } from './items';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/rust_coarse_01_diff_1k.webp';
import NormalMap from '../textures/rust_coarse_01_nor_gl_1k.webp';
import RoughnessMap from '../textures/rust_coarse_01_rough_1k.webp';
import Achievements, { Achievement } from '../ui/stores/achievements';

export class Sink extends PoweredContainer<
  {
    type: 'points';
    count: number;
  }
> {
  private points: number;

  constructor(parent: Sinks, connectors: Connectors, position: Vector3, rotation: number) {
    super(parent, connectors, position, rotation, 100);
    this.points = 0;
  }

  override canInput() {
    return this.enabled && this.powered;
  }

  override input(item: Item) {
    this.setPoints(
      this.points + (Sinking[item] || 1)
    );
    Achievements.complete(Achievement.points);
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

const connectors = [
  { position: new Vector3(0, 0, 1.875) },
  { position: new Vector3(0, 0, -1.875), rotation: Math.PI * -1 },
  { position: new Vector3(1.875, 0, 0), rotation: Math.PI * 0.5 },
  { position: new Vector3(-1.875, 0, 0), rotation: Math.PI * -0.5 },
];

class Sinks extends Instances<Sink> {
  private static collider: RAPIER.ColliderDesc | undefined;
  static getCollider() {
    if (!Sinks.collider) {
      Sinks.collider = RAPIER.ColliderDesc.cylinder(2, 2);
    }
    return Sinks.collider;
  }

  private static connectors: Connectors | undefined;
  static getConnectors() {
    if (!Sinks.connectors) {
      Sinks.connectors = new Connectors(connectors);
    }
    return Sinks.connectors;
  }

  private static geometry: BufferGeometry | undefined;
  static getGeometry() {
    if (!Sinks.geometry) {
      const csgEvaluator = new Evaluator();
      const base = new Brush(new CylinderGeometry(2, 2, 4));
      const opening = new Brush(new BoxGeometry(1.5, 1.5, 0.5));
      let brush: Brush = base;
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
    super(
      {
        collider: Sinks.getCollider(),
        geometry: Sinks.getGeometry(),
        material: Sinks.getMaterial(),
      },
      physics
    );
  }

  create(position: Vector3, rotation: number) {
    return super.addInstance(new Sink(this, Sinks.getConnectors(), position, rotation));
  }
}

export default Sinks;
