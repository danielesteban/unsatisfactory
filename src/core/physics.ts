import RAPIER from '@dimforge/rapier3d-compat';
import { Vector3 } from 'three';

export type Controller = {
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  controller: RAPIER.KinematicCharacterController;
  offset: number;
  step(movement: RAPIER.Vector): RAPIER.Vector;
};

export type Intersection = {
  distance: number;
  normal: Vector3;
  object?: any;
  point: Vector3;
};

class Physics {
  private hasLoaded: boolean;
  private isReady: boolean;
  private bodies: WeakMap<any, RAPIER.RigidBody> = new WeakMap();
  private bodyQueue: Map<any, { body: RAPIER.RigidBodyDesc; collider: RAPIER.ColliderDesc | RAPIER.ColliderDesc[]; }> = new Map();
  private colliders: WeakMap<any, RAPIER.Collider> = new WeakMap();
  private colliderQueue: Map<any, RAPIER.ColliderDesc> = new Map();
  private controllerQueue: (() => void)[] = [];
  private dynamicBodies: Map<any, { body: RAPIER.RigidBody; update: (body: RAPIER.RigidBody) => void; }> = new Map();
  private dynamicBodyQueue: Map<any, { body: RAPIER.RigidBodyDesc; collider: RAPIER.ColliderDesc; update: (body: RAPIER.RigidBody) => void; }> = new Map();
  private world?: RAPIER.World;

  constructor() {
    this.hasLoaded = false;
    this.isReady = false;
    RAPIER.init().then(() => {
      this.hasLoaded = true;
      if (this.isReady) {
        this.init();
      }
    });
  }

  init() {
    const { hasLoaded } = this;
    if (!hasLoaded) {
      this.isReady = true;
      return;
    }
    if (this.world) {
      throw new Error();
    }
    this.world = new RAPIER.World(new RAPIER.Vector3(0, -10, 0));
    this.colliderQueue.forEach((collider, ref) => this.addCollider(ref, collider));
    this.colliderQueue.clear();
    this.bodyQueue.forEach(({ body, collider }, ref) => this.addBody(ref, body, collider));
    this.bodyQueue.clear();
    this.dynamicBodyQueue.forEach(({ body, collider, update }, ref) => this.addDynamicBody(ref, body, collider, update));
    this.dynamicBodyQueue.clear();
    this.controllerQueue.forEach((resolve) => resolve());
    this.controllerQueue.length = 0;
    this.step(0);
  }

  step(delta: number) {
    const { dynamicBodies, world } = this;
    if (!world) {
      return;
    }
    world.timestep = delta;
    world.step();
    dynamicBodies.forEach(({ body, update }) => update(body));
  }

  addBody(
    ref: any,
    bodyDesc: RAPIER.RigidBodyDesc,
    colliderDesc: RAPIER.ColliderDesc | RAPIER.ColliderDesc[],
  ) {
    const { bodies, bodyQueue, world } = this;
    if (!world) {
      bodyQueue.set(ref, { body: bodyDesc, collider: colliderDesc }); 
      return;
    }
    if (bodies.has(ref)) {
      this.removeBody(ref);
    }
    const body = world.createRigidBody(bodyDesc);
    body.userData = { ref };
    if (Array.isArray(colliderDesc)) {
      colliderDesc.forEach((colliderDesc) => (
        world.createCollider(colliderDesc, body)
      ));
    } else {
      world.createCollider(colliderDesc, body);
    }
    bodies.set(ref, body);
    return body;
  }

  removeBody(ref: any) {
    const { bodies, bodyQueue, world } = this;
    if (!world) {
      if (bodyQueue.has(ref)) {
        bodyQueue.delete(ref);
      }
      return;
    }
    const body = bodies.get(ref);
    if (!body) {
      return;
    }
    bodies.delete(ref);
    world.removeRigidBody(body);
  }

  addCollider(ref: any, collider: RAPIER.ColliderDesc) {
    const { colliders, colliderQueue, world } = this;
    if (!world) {
      colliderQueue.set(ref, collider); 
      return;
    }
    if (colliders.has(ref)) {
      this.removeCollider(ref);
    }
    colliders.set(ref, world.createCollider(collider));
  }

  removeCollider(ref: any) {
    const { colliders, colliderQueue, world } = this;
    if (!world) {
      if (colliderQueue.has(ref)) {
        colliderQueue.delete(ref);
      }
      return;
    }
    const collider = colliders.get(ref);
    if (!collider) {
      return;
    }
    colliders.delete(ref);
    world.removeCollider(collider, true);
  }

  getController(position: RAPIER.Vector, height: number = 2, offset: number = height * 0.375, radius: number = 0.5) {
    return new Promise<void>((resolve) => {
      const { controllerQueue, world } = this;
      if (!world) {
        controllerQueue.push(resolve);
        return;
      }
      resolve();
    })
    .then(() => {
      const { world } = this;
      const body = world!.createRigidBody(
        RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
          position.x, position.y - offset, position.z
        )
      );
      const collider = world!.createCollider(
        RAPIER.ColliderDesc.capsule(height * 0.5, radius)
          .setCollisionGroups((0xFFFF << 16) | (1 << 1))
          .setSolverGroups((0xFFFF << 16) | (1 << 1)),
        body
      );
      const controller = world!.createCharacterController(0.1);
      return {
        body,
        collider,
        controller,
        offset,
        step(movement: RAPIER.Vector) {
          controller.computeColliderMovement(collider, movement);
          const computed = controller.computedMovement();
          const position = body.translation();
          body.setNextKinematicTranslation({
            x: position.x + computed.x,
            y: position.y + computed.y,
            z: position.z + computed.z
          });
          return computed;
        },
      };
    });
  }

  private static readonly ray: RAPIER.Ray = new RAPIER.Ray(new RAPIER.Vector3(0, 0, 0), new RAPIER.Vector3(0, 0, 0));
  castRay(intersection: Intersection, origin: RAPIER.Vector, dir: RAPIER.Vector, maxToi: number = 1000): boolean {
    const { world } = this;
    const { ray } = Physics;
    ray.origin.x = origin.x;
    ray.origin.y = origin.y;
    ray.origin.z = origin.z;
    ray.dir.x = dir.x;
    ray.dir.y = dir.y;
    ray.dir.z = dir.z;
    if (world) {
      const hit = world.castRayAndGetNormal(ray, maxToi, false, undefined, (1 << 16) | 0xFFFF);
      if (hit !== null) {
        intersection.distance = hit.toi;
        intersection.normal.copy(hit.normal as Vector3);
        intersection.object = (hit.collider.parent()?.userData as any)?.ref;
        intersection.point.copy(ray.pointAt(hit.toi) as Vector3);
        return true;
      }
    }
    return false;
  }

  getDynamicBody(ref: any) {
    const { dynamicBodies } = this;
    return dynamicBodies.get(ref)?.body;
  }

  addDynamicBody(
    ref: any,
    bodyDesc: RAPIER.RigidBodyDesc,
    colliderDesc: RAPIER.ColliderDesc,
    update: (body: RAPIER.RigidBody) => void
  ) {
    const { dynamicBodies, dynamicBodyQueue, world } = this;
    if (!world) {
      dynamicBodyQueue.set(ref, { body: bodyDesc, collider: colliderDesc, update }); 
      return;
    }
    if (dynamicBodies.has(ref)) {
      this.removeBody(ref);
    }
    const body = world.createRigidBody(bodyDesc);
    const collider = world.createCollider(colliderDesc, body);
    collider.setCollisionGroups((0xFFFF << 16) | (1 << 2));
    collider.setSolverGroups((0xFFFF << 16) | (1 << 2));
    dynamicBodies.set(ref, { body, update });
    return body;
  }

  removeDynamicBody(ref: any) {
    const { dynamicBodies, dynamicBodyQueue, world } = this;
    if (!world) {
      if (dynamicBodyQueue.has(ref)) {
        dynamicBodyQueue.delete(ref);
      }
      return;
    }
    const body = dynamicBodies.get(ref);
    if (!body) {
      return;
    }
    dynamicBodies.delete(ref);
    world.removeRigidBody(body.body);
  }
}

export default Physics;
