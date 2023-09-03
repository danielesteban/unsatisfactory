import RAPIER from '@dimforge/rapier3d-compat';
import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  MeshStandardMaterial,
  Object3D,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ADDITION, Brush, Evaluator } from 'three-bvh-csg';
import { Connectors, PoweredContainer } from '../core/container';
import Instances from '../core/instances';
import Physics from '../core/physics';
import { Item } from './items';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/rust_coarse_01_diff_1k.webp';
import NormalMap from '../textures/rust_coarse_01_nor_gl_1k.webp';
import RoughnessMap from '../textures/rust_coarse_01_rough_1k.webp';

// @dani @hack @grievance
// The poles aren't really containers.
// Nor they can be powered.
// But they need to be able to be wired up.
// OOP inheritance has failed me once again.
// I should have listened to the ECS evangelists.
// I'm just too lazy to care for switching to composition at this stage.
export class Pole extends PoweredContainer {
  constructor(connectors: Connectors, position: Vector3, rotation: number) {
    super(connectors, position, rotation, 0, 4);
  }

  override getWireConnector() {
    return this.position.clone()
      .addScaledVector(Object3D.DEFAULT_UP, 2.75);
  }
}

class Poles extends Instances<Pole> {
  static override readonly cost: typeof Instances.cost = [
    { item: Item.ironRod, count: 5 },
    { item: Item.wire, count: 5 },
  ];

  private static collider: RAPIER.ColliderDesc | undefined;
  static getCollider() {
    if (!Poles.collider) {
      Poles.collider = RAPIER.ColliderDesc.cuboid(0.25, 3, 0.25);
    }
    return Poles.collider;
  }

  private static connectors: Connectors | undefined;
  static getConnectors() {
    if (!Poles.connectors) {
      Poles.connectors = new Connectors([]);
    }
    return Poles.connectors;
  }

  private static geometry: BufferGeometry | undefined;
  static getGeometry() {
    if (!Poles.geometry) {
      const csgEvaluator = new Evaluator();
      const base = new Brush(new BoxGeometry(0.5, 5.25, 0.5));
      base.position.set(0, -0.375, 0);
      base.updateMatrixWorld();
      const pole = new Brush(new CylinderGeometry(0.125, 0.125, 0.25));
      pole.position.set(0, 2.375, 0);
      pole.updateMatrixWorld();
      let brush = csgEvaluator.evaluate(base, pole, ADDITION);
      const connector = new Brush(new CylinderGeometry(0.25, 0.25, 0.5));
      connector.position.copy(pole.position).add(new Vector3(0, 0.375, 0));
      connector.updateMatrixWorld();
      brush = csgEvaluator.evaluate(brush, connector, ADDITION);
      Poles.geometry = mergeVertices(brush.geometry);
      Poles.geometry.computeBoundingSphere();
    }
    return Poles.geometry;
  }

  private static material: MeshStandardMaterial | undefined;
  static getMaterial() {
    if (!Poles.material) {
      const material = new MeshStandardMaterial({
        map: loadTexture(DiffuseMap),
        normalMap: loadTexture(NormalMap),
        roughnessMap: loadTexture(RoughnessMap),
      });
      material.map!.anisotropy = 16;
      material.map!.colorSpace = SRGBColorSpace;
      Poles.material = material;
    }
    return Poles.material;
  }

  constructor(physics: Physics) {
    super(
      {
        collider: Poles.getCollider(),
        geometry: Poles.getGeometry(),
        material: Poles.getMaterial(),
      },
      physics
    );
  }

  create(position: Vector3, rotation: number, withCost: boolean = true) {
    return super.addInstance(
      new Pole(Poles.getConnectors(), position, rotation),
      withCost
    );
  }
}

export default Poles;
