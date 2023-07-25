import {
  BoxGeometry,
  BufferGeometry,
  CapsuleGeometry,
  Curve,
  CylinderGeometry,
  DynamicDrawUsage,
  InstancedMesh,
  Group,
  Material,
  Matrix4,
  MeshStandardMaterial,
  Object3D,
  RepeatWrapping,
  SRGBColorSpace,
  TetrahedronGeometry,
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
  ore,
}

export type Recipe = {
  input: { item: Item; count: number; };
  output: { item: Item; count: number; };
  rate: number;
};

export const Recipes: Recipe[] = [
  {
    input: {
      item: Item.ore,
      count: 1,
    },
    output: {
      item: Item.capsule,
      count: 1,
    },
    rate: 1,
  },
  {
    input: {
      item: Item.capsule,
      count: 1,
    },
    output: {
      item: Item.cylinder,
      count: 1,
    },
    rate: 2,
  },
  {
    input: {
      item: Item.capsule,
      count: 1,
    },
    output: {
      item: Item.box,
      count: 1,
    },
    rate: 2,
  }
];

class InstancedItems extends InstancedMesh {
  constructor(geometry: BufferGeometry, material: Material, count: number) {
    super(geometry, material, count);
    this.instanceMatrix.setUsage(DynamicDrawUsage);
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
    box.translate(0, 0.125, 0);
    box.computeBoundingSphere();
    const capsule = new CapsuleGeometry(0.125, 0.125);
    capsule.rotateZ(Math.PI * 0.5);
    capsule.translate(0, 0.125, 0);
    capsule.computeBoundingSphere();
    const cylinder = new CylinderGeometry(0.125, 0.125, 0.25);
    cylinder.translate(0, 0.125, 0);
    cylinder.computeBoundingSphere();
    const ore = new TetrahedronGeometry(0.2, 2);
    ore.scale(1.5, 1, 1);
    ore.translate(0, 0.2, 0);
    ore.computeBoundingSphere();
    Items.geometries = {
      [Item.box]: box,
      [Item.capsule]: capsule,
      [Item.cylinder]: cylinder,
      [Item.ore]: ore,
    };
  }

  private static material: MeshStandardMaterial | undefined;
  static getMaterial() {
    if (!Items.material) {
      const material = new MeshStandardMaterial({
        map: loadTexture(DiffuseMap),
        normalMap: loadTexture(NormalMap),
        roughnessMap: loadTexture(RoughnessMap),
      });
      material.map!.anisotropy = 16;
      material.map!.colorSpace = SRGBColorSpace;
      [material.map!, material.normalMap!, material.roughnessMap!].forEach((map) => {
        map.wrapS = map.wrapT = RepeatWrapping;
      });
      Items.material = material;
    }
    return Items.material;
  }

  private readonly instances: Record<Exclude<Item, Item.none>, InstancedItems | undefined>;
  private readonly path: Curve<Vector3>;
  private readonly tangents: Vector3[];

  constructor(count: number, path: Curve<Vector3>) {
    if (!Items.geometries) {
      Items.setupGeometries();
    }
    super();
    this.updateMatrixWorld();
    this.matrixAutoUpdate = false;
    this.instances = {
      [Item.box]: undefined,
      [Item.capsule]: undefined,
      [Item.cylinder]: undefined,
      [Item.ore]: undefined,
    };
    this.path = path;
    const { tangents } = path.computeFrenetFrames(count, false);
    this.tangents = tangents;
  }

  dispose() {
    (this.children as InstancedItems[]).forEach((items) => items.dispose());
  }

  private static aux: Vector3 = new Vector3();
  private static transform: Object3D = new Object3D();
  animate(slots: { item: Item; locked: boolean; }[], step: number) {
    const { children, instances, path, tangents } = this;
    const count = slots.length;
    (children as InstancedItems[]).forEach((items) => items.reset());
    slots.forEach(({ item, locked }, i) => {
      if (item === Item.none) {
        return;
      }
      if (!instances[item]) {
        instances[item] = new InstancedItems(Items.geometries![item], Items.getMaterial(), count);
        this.add(instances[item]!);
      }
      const alpha = locked ? 1 : step;
      path.getPointAt((i + alpha) / count, Items.transform.position);
      Items.transform.lookAt(Items.aux.lerpVectors(tangents[i], tangents[i + 1], alpha).add(Items.transform.position));
      Items.transform.updateMatrix();
      instances[item]!.addInstance(Items.transform.matrix);
    });
    (children as InstancedItems[]).forEach((items) => items.update());
  }
}

export default Items;
