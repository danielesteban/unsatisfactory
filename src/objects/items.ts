import {
  BoxGeometry,
  BufferGeometry,
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
import RockDiffuseMap from '../textures/rock_boulder_dry_diff_1k.webp';
import RockNormalMap from '../textures/rock_boulder_dry_nor_gl_1k.webp';
import RockRoughnessMap from '../textures/rock_boulder_dry_rough_1k.webp';
import RustDiffuseMap from '../textures/rust_coarse_01_diff_1k.webp';
import RustNormalMap from '../textures/rust_coarse_01_nor_gl_1k.webp';
import RustRoughnessMap from '../textures/rust_coarse_01_rough_1k.webp';

export enum Item {
  none,
  box,
  cylinder,
  ingot,
  ore,
}

export const ItemName = {
  [Item.none]: 'None',
  [Item.box]: 'Box',
  [Item.cylinder]: 'Cylinder',
  [Item.ingot]: 'Ingot',
  [Item.ore]: 'Ore',
};

export const Mining: Partial<Record<Item, { consumption: number; rate: number; }>> = {
  [Item.ore]: { consumption: 100, rate: 3 },
};

export const Sinking: Partial<Record<Item, number>> = {
  [Item.box]: 4,
  [Item.cylinder]: 8,
  [Item.ingot]: 2,
};

export enum Transformer {
  fabricator,
  smelter,
}

export type Recipe = {
  input: { item: Item; count: number; };
  output: { item: Item; count: number; };
  rate: number;
  transformer: Transformer;
};

export const Recipes: Recipe[] = [
  {
    input: {
      item: Item.ore,
      count: 1,
    },
    output: {
      item: Item.ingot,
      count: 1,
    },
    rate: 10,
    transformer: Transformer.smelter,
  },
  {
    input: {
      item: Item.ingot,
      count: 1,
    },
    output: {
      item: Item.cylinder,
      count: 1,
    },
    rate: 10,
    transformer: Transformer.fabricator,
  },
  {
    input: {
      item: Item.ingot,
      count: 1,
    },
    output: {
      item: Item.box,
      count: 2,
    },
    rate: 10,
    transformer: Transformer.fabricator,
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

  update() {
    if (!this.count) {
      return;
    }
    this.computeBoundingSphere();
    this.instanceMatrix.needsUpdate = true;
    this.visible = true;
  }
}

class Items extends Group {
  private static geometries: Record<Exclude<Item, Item.none>, BufferGeometry> | undefined;
  private static setupGeometries() {
    const box = new BoxGeometry(0.25, 0.25, 0.25);
    box.translate(0, 0.125, 0);
    box.computeBoundingSphere();
    const cylinder = new CylinderGeometry(0.125, 0.125, 0.25);
    cylinder.translate(0, 0.125, 0);
    cylinder.computeBoundingSphere();
    const ingot = new BoxGeometry(0.5, 0.125, 0.25);
    ingot.translate(0, 0.0625, 0);
    ingot.computeBoundingSphere();
    const ore = new TetrahedronGeometry(0.2, 2);
    ore.scale(1.5, 1, 1);
    ore.translate(0, 0.2, 0);
    ore.computeBoundingSphere();
    Items.geometries = {
      [Item.box]: box,
      [Item.cylinder]: cylinder,
      [Item.ingot]: ingot,
      [Item.ore]: ore,
    };
  }

  private static materials: Record<Exclude<Item, Item.none>, MeshStandardMaterial> | undefined;
  private static setupMaterials() {
    if (!Items.materials) {
      const getMaterial = (diffuse: string, normal: string, roughness: string) => {
        const material = new MeshStandardMaterial({
          map: loadTexture(diffuse),
          normalMap: loadTexture(normal),
          roughnessMap: loadTexture(roughness),
        });
        material.map!.anisotropy = 16;
        material.map!.colorSpace = SRGBColorSpace;
        [material.map!, material.normalMap!, material.roughnessMap!].forEach((map) => {
          map.wrapS = map.wrapT = RepeatWrapping;
        });
        return material;
      };
      const processed = new MeshStandardMaterial({
        color: 0x332211,
        roughness: 0.15,
      });
      const rock = getMaterial(RockDiffuseMap, RockNormalMap, RockRoughnessMap);
      rock.envMapIntensity = rock.roughness = 0.7;
      const rust = getMaterial(RustDiffuseMap, RustNormalMap, RustRoughnessMap);
      Items.materials = {
        [Item.box]: processed,
        [Item.cylinder]: processed,
        [Item.ingot]: rust,
        [Item.ore]: rock,
      };
    }
    return Items.materials;
  }

  static getMaterials() {
    if (!Items.materials) {
      Items.setupMaterials();
    }
    const materials: MeshStandardMaterial[] = [];
    for (let key in Items.materials) {
      const material = Items.materials[key as any as Exclude<Item, Item.none>];
      if (!materials.includes(material)) {
        materials.push(material);
      }
    }
    return materials;
  }

  private readonly instances: Record<Exclude<Item, Item.none>, InstancedItems | undefined>;
  private readonly path: Curve<Vector3>;
  private readonly tangents: Vector3[];

  constructor(count: number, path: Curve<Vector3>) {
    if (!Items.geometries) {
      Items.setupGeometries();
    }
    if (!Items.materials) {
      Items.setupMaterials();
    }
    super();
    this.updateMatrixWorld();
    this.matrixAutoUpdate = false;
    this.instances = {
      [Item.box]: undefined,
      [Item.cylinder]: undefined,
      [Item.ingot]: undefined,
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
        instances[item] = new InstancedItems(Items.geometries![item], Items.materials![item], count);
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
