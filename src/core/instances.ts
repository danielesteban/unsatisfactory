import RAPIER from '@dimforge/rapier3d-compat';
import {
  BaseEvent,
  BufferGeometry,
  EventDispatcher,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Material,
  Object3D,
  Quaternion,
  Vector3,
} from 'three';
import { BuildCost, defaultBuildCost } from './data';
import Inventory from '../ui/stores/inventory';
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
    ] as any[];
  }

  private static quaternion: Quaternion = new Quaternion();
  static getQuaternion(instance: Instance, inverse: boolean = false) {
    return Instance.quaternion.setFromAxisAngle(Object3D.DEFAULT_UP, instance.rotation * (inverse ? -1 : 1));
  }
}

class InstancesChunk extends InstancedMesh {
  private readonly instances: Instance[];
  private maxInstanceCount: number;

  constructor(geometry: BufferGeometry, material: Material | Material[], depthMaterial?: Material) {
    super(geometry, material, 16);
    this.castShadow = this.receiveShadow = true;
    this.customDepthMaterial = depthMaterial;
    this.updateMatrixWorld();
    this.matrixAutoUpdate = false;
    this.visible = false;
    this.instances = [];
    this.maxInstanceCount = this.count;
    this.count = 0;
  }

  addInstance(instance: Instance) {
    const { instances, maxInstanceCount } = this;
    instances.push(instance);
    if (instances.length > maxInstanceCount) {
      this.maxInstanceCount += 16;
      this.instanceMatrix = new InstancedBufferAttribute(new Float32Array(this.maxInstanceCount * 16), 16);
      this.updateInstances();
    } else {
      this.count++;
      this.setMatrixAt(this.count - 1, InstancesChunk.getTransform(instance));
      this.instanceMatrix.needsUpdate = true;
      this.computeBoundingSphere();
    }
    this.visible = true;
  }

  removeInstance(instance: Instance) {
    const { instances } = this;
    const i = instances.indexOf(instance);
    if (i === -1) {
      return;
    }
    instances.splice(i, 1);
    this.updateInstances();
    this.visible = this.count > 0;
  }

  private updateInstances() {
    const { instances } = this;
    this.count = instances.length;
    instances.forEach((instance, i) => (
      this.setMatrixAt(i, InstancesChunk.getTransform(instance))
    ));
    this.instanceMatrix.needsUpdate = true;
    this.computeBoundingSphere();
  }

  private static scale: Vector3 = new Vector3(1, 1, 1);
  private static transform: Matrix4 = new Matrix4();
  private static getTransform(instance: Instance) {
    return InstancesChunk.transform.compose(
      instance.position,
      Instance.getQuaternion(instance),
      InstancesChunk.scale
    );
  }
}

type InstanceModel = {
  collider: RAPIER.ColliderDesc | RAPIER.ColliderDesc[];
  geometry: BufferGeometry;
  depthMaterial?: Material;
  material: Material | Material[];
};

class Instances<InstanceType extends Instance> extends Group {
  private static maxDistance: number = 64 ** 2;

  private readonly chunks: InstancesChunk[];
  private readonly instances: InstanceType[];
  private readonly instanceChunks: WeakMap<InstanceType, InstancesChunk>;
  private readonly model: InstanceModel;
  private readonly physics: Physics;

  constructor(model: InstanceModel, physics: Physics) {
    super();
    this.updateMatrixWorld();
    this.matrixAutoUpdate = false;
    this.chunks = [];
    this.instances = [];
    this.instanceChunks = new WeakMap();
    this.model = model;
    this.physics = physics;
  }

  canAfford() {
    return !this.getCost().find(({ item, count }) => !Inventory.canOutput(item, count));
  }

  protected static readonly cost: BuildCost = defaultBuildCost;
  getCost() {
    return (<typeof Instances<InstanceType>> this.constructor).cost;
  }

  getCount() {
    const { instances } = this;
    return instances.length;
  }

  getInstance(index: number) {
    const { instances } = this;
    return instances[index]!;
  }

  addInstance(instance: InstanceType, withCost: boolean) {
    const { chunks, instances, instanceChunks, model, physics } = this;
    let { chunk } = chunks.reduce<{ chunk: undefined | InstancesChunk; distance: number; }>((closest, chunk) => {
      const distance = chunk.boundingSphere!.center.distanceToSquared(instance.position);
      if (distance < Instances.maxDistance && closest.distance > distance) {
        closest.distance = distance;
        closest.chunk = chunk;
      }
      return closest;
    }, { chunk: undefined, distance: Infinity });
    if (!chunk) {
      chunk = new InstancesChunk(model.geometry, model.material, model.depthMaterial);
      chunks.push(chunk);
      this.add(chunk);
    }
    instances.push(instance);
    instanceChunks.set(instance, chunk);
    chunk.addInstance(instance);
    physics.addBody(
      instance,
      RAPIER.RigidBodyDesc.fixed()
        .setTranslation(instance.position.x, instance.position.y, instance.position.z)
        .setRotation(Instance.getQuaternion(instance)),
      model.collider
    );
    if (withCost) {
      this.getCost().forEach(({ item, count }) => Inventory.output(item, count));
    }
    return instance;
  }

  removeInstance(instance: InstanceType) {
    const { chunks, instances, instanceChunks, physics } = this;
    let i = instances.indexOf(instance);
    if (i === -1) {
      return;
    }
    instances.splice(i, 1);
    this.getCost().forEach(({ item, count }) => Inventory.input(item, count));
    instance.dispose();
    physics.removeBody(instance);
    const chunk = instanceChunks.get(instance);
    if (!chunk) {
      return;
    }
    instanceChunks.delete(instance);
    chunk.removeInstance(instance);
    if (chunk.count > 0) {
      return;
    }
    i = chunks.indexOf(chunk);
    if (i === -1) {
      return;
    }
    chunks.splice(i, 1);
    chunk.dispose();
    this.remove(chunk);
  }
}

export default Instances;
