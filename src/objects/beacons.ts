import RAPIER from '@dimforge/rapier3d-compat';
import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Vector3,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ADDITION, SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
import Instances, { Instance } from '../core/instances';
import { ContainerMaterials } from '../core/materials';
import Physics from '../core/physics';
import Store from '../ui/stores/beacons';

export class Beacon extends Instance {

}

class Beacons extends Instances<Beacon> {
  private static collider: RAPIER.ColliderDesc | undefined;
  static getCollider() {
    if (!Beacons.collider) {
      Beacons.collider = RAPIER.ColliderDesc.cuboid(0.5, 1.75, 0.5);
    }
    return Beacons.collider;
  }

  private static geometry: BufferGeometry | undefined;
  static getGeometry() {
    if (!Beacons.geometry) {
      const csg = new Evaluator();
      const material = Beacons.getMaterial();

      const base = new Brush(new BoxGeometry(1, 2, 1), material[0]);
      base.position.set(0, -0.75, 0);
      base.updateMatrixWorld();
      const antennaShaft = new Brush(new CylinderGeometry(0.05, 0.05, 1), material[1]);
      const antennaCap = new Brush(new CylinderGeometry(0.1, 0.1, 0.5), material[1]);
      antennaCap.position.set(0, 0.75, 0);
      antennaCap.updateMatrixWorld();
      const antenna = csg.evaluate(antennaShaft, antennaCap, ADDITION);
      antenna.position.set(0, 0.75, 0);
      antenna.updateMatrixWorld();

      let brush = csg.evaluate(base, antenna, ADDITION);

      const stripe = new Brush(new BoxGeometry(0.25, 1.5, 0.25), material[1]);
      ([
        new Vector3(0, -0.75, 0.375),
        new Vector3(0, -0.75, -0.375),
      ]).forEach((position) => {
        stripe.position.copy(position);
        stripe.rotation.set(0, 0, 0);
        stripe.updateMatrixWorld();
        brush = csg.evaluate(brush, stripe, SUBTRACTION);

        stripe.position.set(position.z, position.y, position.x);
        stripe.rotation.set(0, Math.PI * 0.5, 0);
        stripe.updateMatrixWorld();
        brush = csg.evaluate(brush, stripe, SUBTRACTION);
      });

      Beacons.geometry = mergeVertices(brush.geometry);
      Beacons.geometry.computeBoundingSphere();
    }
    return Beacons.geometry;
  }

  static getMaterial() {
    return ContainerMaterials;
  }

  constructor(physics: Physics) {
    super(
      {
        collider: Beacons.getCollider(),
        geometry: Beacons.getGeometry(),
        material: Beacons.getMaterial(),
      },
      physics
    );
    Store.connect(this);
  }

  create(position: Vector3, rotation: number, withCost: boolean = true) {
    return super.addInstance(
      new Beacon(position, rotation),
      withCost
    );
  }
}

export default Beacons;
