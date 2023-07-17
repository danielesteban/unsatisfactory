import {
  BufferGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  MathUtils,
  Matrix4,
  Material,
  Vector3,
} from 'three';

interface Instance {
  id: string;
  position: Vector3;
}

class Instances<InstanceType extends Instance> extends InstancedMesh {
  private maxInstanceCount: number;
  public readonly instances: InstanceType[];
  private static transform: Matrix4 = new Matrix4();
  constructor(geometry: BufferGeometry, material: Material) {
    super(geometry, material, 32);
    this.castShadow = this.receiveShadow = true;
    this.updateMatrixWorld();
    this.matrixAutoUpdate = false;
    this.visible = false;
    this.maxInstanceCount = this.count;
    this.count = 0;
    this.instances = [];
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
}

export default Instances;
