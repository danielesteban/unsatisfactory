import {
  BoxGeometry,
  BufferGeometry,
  CapsuleGeometry,
  CylinderGeometry,
  Curve,
  InstancedMesh,
  Group,
  Material,
  Matrix4,
  MeshStandardMaterial,
  RepeatWrapping,
  Object3D,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/rust_coarse_01_diff_1k.jpg';
import NormalMap from '../textures/rust_coarse_01_nor_gl_1k.jpg';
import RoughnessMap from '../textures/rust_coarse_01_rough_1k.jpg';

export enum Item {
  none,
  box,
  capsule,
  cylinder,
}

class InstancedItems extends InstancedMesh {
  constructor(geometry: BufferGeometry, material: Material, count: number) {
    super(geometry, material, count);
    this.receiveShadow = true;
    this.updateMatrixWorld();
    this.matrixAutoUpdate = false;
    this.count = 0;
  }

  addInstance(transform: Matrix4) {
    this.setMatrixAt(this.count, transform);
    this.count++;
  }

  reset() {
    this.count = 0;
    this.visible = false;
  }

  override raycast() {

  }

  update() {
    if (!this.count) {
      return;
    }
    this.computeBoundingSphere();
    this.instanceMatrix.needsUpdate = true;
    this.visible = true;
  }
}

export class Items extends Group {
  private static geometries: Record<Exclude<Item, Item.none>, BufferGeometry> | undefined;
  static setupGeometries() {
    const box = new BoxGeometry(0.25, 0.25, 0.25);
    box.computeBoundingSphere();
    const capsule = new CapsuleGeometry(0.125, 0.125);
    capsule.rotateZ(Math.PI * 0.5);
    capsule.computeBoundingSphere();
    const cylinder = new CylinderGeometry(0.125, 0.125, 0.25);
    cylinder.computeBoundingSphere();
    Items.geometries = {
      [Item.box]: box,
      [Item.capsule]: capsule,
      [Item.cylinder]: cylinder,
    };
  }

  private static material: MeshStandardMaterial | undefined;
  static setupMaterial() {
    Items.material = new MeshStandardMaterial({
      map: loadTexture(DiffuseMap),
      normalMap: loadTexture(NormalMap),
      roughnessMap: loadTexture(RoughnessMap),
    });
    Items.material.map!.anisotropy = 16;
    Items.material.map!.colorSpace = SRGBColorSpace;
    [Items.material.map!, Items.material.normalMap!, Items.material.roughnessMap!].forEach((map) => {
      map.wrapS = map.wrapT = RepeatWrapping;
    });
    return Items.material;
  }

  private readonly instances: Record<Exclude<Item, Item.none>, InstancedItems | undefined>;
  private readonly path: Curve<Vector3>;
  private readonly normals: Vector3[];
  private readonly tangents: Vector3[];

  constructor(count: number, path: Curve<Vector3>) {
    if (!Items.geometries) {
      Items.setupGeometries();
    }
    if (!Items.material) {
      Items.setupMaterial();
    }
    super();
    this.updateMatrixWorld();
    this.matrixAutoUpdate = false;
    this.instances = {
      [Item.box]: undefined,
      [Item.capsule]: undefined,
      [Item.cylinder]: undefined,
    };
    this.path = path;
    const { normals, tangents } = path.computeFrenetFrames(count, false);
    this.normals = normals;
    this.tangents = tangents;
  }

  dispose() {
    (this.children as InstancedItems[]).forEach((items) => items.dispose());
  }

  private static aux: Vector3 = new Vector3();
  private static transform: Object3D = new Object3D();
  animate(items: Item[], step: number) {
    const { children, instances, path, normals, tangents } = this;
    const count = items.length;
    (children as InstancedItems[]).forEach((items) => items.reset());
    items.forEach((item, i) => {
      if (item === Item.none) {
        return;
      }
      if (!instances[item]) {
        instances[item] = new InstancedItems(Items.geometries![item], Items.material!, count);
        this.add(instances[item]!);
      }
      path.getPointAt((i + step) / count, Items.transform.position).addScaledVector(Items.aux.lerpVectors(normals[i], normals[i + 1], step), -0.125);
      Items.transform.lookAt(Items.aux.lerpVectors(tangents[i], tangents[i + 1], step).add(Items.transform.position));
      Items.transform.updateMatrix();
      instances[item]!.addInstance(Items.transform.matrix);
    });
    (children as InstancedItems[]).forEach((items) => items.update());
  }
}

export default Items;
