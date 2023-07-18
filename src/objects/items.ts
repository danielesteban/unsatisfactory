import {
  BoxGeometry,
  BufferGeometry,
  CapsuleGeometry,
  CylinderGeometry,
  Curve,
  InstancedMesh,
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
  box,
  capsule,
  cylinder,
}

export class Items extends InstancedMesh {
  private static geometries: Record<Item, BufferGeometry> | undefined;
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

  private static aux: Vector3 = new Vector3();
  private static transform: Object3D = new Object3D();
  constructor(item: Item, path: Curve<Vector3>) {
    if (!Items.geometries) {
      Items.setupGeometries();
    }
    if (!Items.material) {
      Items.setupMaterial();
    }
    const count = Math.ceil(path.getLength() / 0.5);
    super(Items.geometries![item], Items.material!, count);
    this.castShadow = this.receiveShadow = true;
    this.updateMatrixWorld();
    this.matrixAutoUpdate = false;
    const { normals, tangents } = path.computeFrenetFrames(count, false);
    for (let i = 0; i < count; i++) {
      path.getPointAt((i + 0.5) / count, Items.transform.position).addScaledVector(Items.aux.lerpVectors(normals[i], normals[i + 1], 0.5), -0.25);
      Items.transform.lookAt(Items.aux.lerpVectors(tangents[i], tangents[i + 1], 0.5).add(Items.transform.position));
      Items.transform.updateMatrix();
      this.setMatrixAt(i, Items.transform.matrix);
    }
    this.computeBoundingSphere();
  }

  override raycast() {

  }
}

export default Items;
