import {
  BufferGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  Intersection,
  Matrix4,
  Material,
  Raycaster,
  Vector3,
} from 'three';

interface Instance {
  position: Vector3;
}

class Instances<InstanceType extends Instance> extends InstancedMesh {
  private readonly collider: BufferGeometry | undefined;
  private readonly instances: InstanceType[];
  private maxInstanceCount: number;
  private static transform: Matrix4 = new Matrix4();

  constructor(geometry: BufferGeometry, material: Material, collider?: BufferGeometry) {
    super(geometry, material, 32);
    this.castShadow = this.receiveShadow = true;
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
      Instances.transform.setPosition(instance.position);
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
    this.updateInstances();
    this.visible = this.count > 0;
  }

  private updateInstances() {
    const { instances } = this;
    this.count = instances.length;
    instances.forEach(({ position }, i) => {
      Instances.transform.setPosition(position);
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
