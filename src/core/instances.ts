import RAPIER from '@dimforge/rapier3d-compat';
import {
  BaseEvent,
  BufferGeometry,
  EventDispatcher,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Material,
  Object3D,
  Quaternion,
  Vector3,
} from 'three';
import Physics from './physics';

export class Instance<Event extends BaseEvent = BaseEvent> extends EventDispatcher<Event> {
  public readonly position: Vector3;
  public readonly rotation: number;

  constructor(position: Vector3, rotation: number) {
    super();
    this.position = position.clone();
    this.rotation = rotation;
  }
  
  dispose() {

  }

  serialize() {
    const { position, rotation } = this;
    return [
      position.toArray(),
      rotation,
    ];
  }
}

class Instances<InstanceType extends Instance> extends InstancedMesh {
  private readonly collider: RAPIER.ColliderDesc | RAPIER.ColliderDesc[];
  private readonly instances: InstanceType[];
  private maxInstanceCount: number;
  private physics: Physics;
  private static rotation: Quaternion = new Quaternion();
  private static scale: Vector3 = new Vector3(1, 1, 1);
  private static transform: Matrix4 = new Matrix4();

  constructor(collider: RAPIER.ColliderDesc | RAPIER.ColliderDesc[], geometry: BufferGeometry, material: Material, physics: Physics, depthMaterial?: Material) {
    super(geometry, material, 16);
    this.castShadow = this.receiveShadow = true;
    this.customDepthMaterial = depthMaterial;
    this.updateMatrixWorld();
    this.matrixAutoUpdate = false;
    this.visible = false;
    this.collider = collider;
    this.physics = physics;
    this.instances = [];
    this.maxInstanceCount = this.count;
    this.count = 0;
  }

  getInstance(index: number) {
    const { instances } = this;
    return instances[index]!;
  }

  addInstance(instance: InstanceType) {
    const { collider, instances, maxInstanceCount, physics } = this;
    instances.push(instance);
    const rotation = Instances.rotation.setFromAxisAngle(Object3D.DEFAULT_UP, instance.rotation);
    physics.addBody(
      instance,
      RAPIER.RigidBodyDesc.fixed()
        .setTranslation(instance.position.x, instance.position.y, instance.position.z)
        .setRotation(rotation),
      collider
    );
    if (instances.length > maxInstanceCount) {
      this.maxInstanceCount += 16;
      this.instanceMatrix = new InstancedBufferAttribute(new Float32Array(this.maxInstanceCount * 16), 16);
      this.updateInstances();
    } else {
      this.count++;
      Instances.transform.compose(
        instance.position,
        Instances.rotation.setFromAxisAngle(Object3D.DEFAULT_UP, instance.rotation),
        Instances.scale
      );
      this.setMatrixAt(this.count - 1, Instances.transform);
      this.instanceMatrix.needsUpdate = true;
      this.computeBoundingSphere();
    }
    this.visible = true;
    return instance;
  }

  removeInstance(instance: InstanceType) {
    const { instances, physics } = this;
    const i = instances.indexOf(instance);
    if (i === -1) {
      return;
    }
    instances.splice(i, 1);
    instance.dispose();
    physics.removeBody(instance);
    this.updateInstances();
    this.visible = this.count > 0;
  }

  private updateInstances() {
    const { instances } = this;
    this.count = instances.length;
    instances.forEach(({ position, rotation }, i) => {
      Instances.transform.setPosition(position);
      Instances.transform.compose(
        position,
        Instances.rotation.setFromAxisAngle(Object3D.DEFAULT_UP, rotation),
        Instances.scale
      );
      this.setMatrixAt(i, Instances.transform);
    });
    this.instanceMatrix.needsUpdate = true;
    this.computeBoundingSphere();
  }
}

export default Instances;
