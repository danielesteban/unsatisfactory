import {
  BaseEvent,
  BufferGeometry,
  EventDispatcher,
  InstancedBufferAttribute,
  InstancedMesh,
  Intersection,
  Matrix4,
  Material,
  Object3D,
  Quaternion,
  Raycaster,
  Vector3,
} from 'three';

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
  private readonly collider: BufferGeometry | undefined;
  private readonly instances: InstanceType[];
  private maxInstanceCount: number;
  private static rotation: Quaternion = new Quaternion();
  private static scale: Vector3 = new Vector3(1, 1, 1);
  private static transform: Matrix4 = new Matrix4();

  constructor(geometry: BufferGeometry, material: Material, collider?: BufferGeometry, depthMaterial?: Material) {
    super(geometry, material, 16);
    this.castShadow = this.receiveShadow = true;
    this.customDepthMaterial = depthMaterial;
    this.updateMatrixWorld();
    this.matrixAutoUpdate = false;
    this.visible = false;
    this.collider = collider;
    this.instances = [];
    this.maxInstanceCount = this.count;
    this.count = 0;
  }

  getInstance(index: number) {
    const { instances } = this;
    return instances[index]!;
  }

  addInstance(instance: InstanceType) {
    const { instances, maxInstanceCount } = this;
    instances.push(instance);
    if (instances.length > maxInstanceCount) {
      this.maxInstanceCount *= 2;
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
    const { instances } = this;
    const i = instances.indexOf(instance);
    if (i === -1) {
      return;
    }
    instances.splice(i, 1);
    instance.dispose();
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

  override raycast(raycaster: Raycaster, intersects: Intersection[]) {
    let geometry: BufferGeometry | undefined;
    if (this.collider) {
      geometry = this.geometry;
      this.geometry = this.collider;
    }
    super.raycast(raycaster, intersects);
    if (geometry) {
      this.geometry = geometry;
    }
  }
}

export default Instances;
