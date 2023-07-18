import {
  BufferGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  Intersection,
  MathUtils,
  Matrix4,
  Material,
  Raycaster,
  Vector3,
} from 'three';

interface Instance {
  id: string;
  position: Vector3;
}

class Instances<InstanceType extends Instance> extends InstancedMesh {
  private readonly collider: BufferGeometry | undefined;
  public readonly instances: InstanceType[];
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

  addInstance(data: Omit<InstanceType, "id">) {
    const { instances, maxInstanceCount } = this;
    const instance = {
      id: MathUtils.generateUUID(),
      ...data,
    };
    instances.push(instance as InstanceType);
    if (instances.length > maxInstanceCount) {
      this.maxInstanceCount *= 2;
      this.instanceMatrix = new InstancedBufferAttribute(new Float32Array(this.maxInstanceCount * 16), 16);
      this.updateInstances();
    } else {
      this.count++;
      Instances.transform.makeTranslation(data.position);
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
      Instances.transform.makeTranslation(position);
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
