import {
  BoxGeometry,
  BufferGeometry,
  Curve,
  CylinderGeometry,
  DynamicDrawUsage,
  IcosahedronGeometry,
  InstancedMesh,
  Group,
  Material,
  Matrix4,
  MeshStandardMaterial,
  Object3D,
  RepeatWrapping,
  Sphere,
  SRGBColorSpace,
  TetrahedronGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ADDITION, SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
import { loadTexture } from '../textures';
import CopperDiffuseMap from '../textures/rock_06_diff_1k.webp';
import CopperNormalMap from '../textures/rock_06_nor_gl_1k.webp';
import CopperRoughnessMap from '../textures/rock_06_rough_1k.webp';
import IronDiffuseMap from '../textures/rock_boulder_dry_diff_1k.webp';
import IronNormalMap from '../textures/rock_boulder_dry_nor_gl_1k.webp';
import IronRoughnessMap from '../textures/rock_boulder_dry_rough_1k.webp';
import RustDiffuseMap from '../textures/rust_coarse_01_diff_1k.webp';
import RustNormalMap from '../textures/rust_coarse_01_nor_gl_1k.webp';
import RustRoughnessMap from '../textures/rust_coarse_01_rough_1k.webp';

export enum Item {
  none,
  wire,
  ironPlate,
  ironIngot,
  ironOre,
  artifact,
  copperIngot,
  copperOre,
  ironRod,
}

export const ItemName = {
  [Item.none]: 'None',
  [Item.artifact]: 'Artifact',
  [Item.copperIngot]: 'Copper Ingot',
  [Item.copperOre]: 'Copper Ore',
  [Item.ironIngot]: 'Iron Ingot',
  [Item.ironOre]: 'Iron Ore',
  [Item.ironPlate]: 'Iron Plate',
  [Item.ironRod]: 'Iron Rod',
  [Item.wire]: 'Wire',
};

export const Mining: Partial<Record<Item, { consumption: number; count: number; rate: number; }>> = {
  [Item.copperOre]: { consumption: 100, count: 20, rate: 20 },
  [Item.ironOre]: { consumption: 100, count: 20, rate: 20 },
};

export const Sinking: Partial<Record<Item, number>> = {
  [Item.artifact]: 32,
  [Item.copperIngot]: 2,
  [Item.ironIngot]: 2,
  [Item.ironPlate]: 6,
  [Item.ironRod]: 4,
  [Item.wire]: 4,
};

export enum Transformer {
  combinator,
  fabricator,
  smelter,
}

export type Recipe = {
  input: { item: Exclude<Item, Item.none>; count: number; }[];
  output: { item: Exclude<Item, Item.none>; count: number; };
  rate: number;
  transformer: Transformer;
};

export const Recipes: Recipe[] = [
  {
    input: [{
      item: Item.copperOre,
      count: 1,
    }],
    output: {
      item: Item.copperIngot,
      count: 1,
    },
    rate: 10,
    transformer: Transformer.smelter,
  },
  {
    input: [{
      item: Item.ironOre,
      count: 1,
    }],
    output: {
      item: Item.ironIngot,
      count: 1,
    },
    rate: 10,
    transformer: Transformer.smelter,
  },
  {
    input: [{
      item: Item.ironIngot,
      count: 1,
    }],
    output: {
      item: Item.ironPlate,
      count: 1,
    },
    rate: 10,
    transformer: Transformer.fabricator,
  },
  {
    input: [{
      item: Item.ironIngot,
      count: 1,
    }],
    output: {
      item: Item.ironRod,
      count: 1,
    },
    rate: 20,
    transformer: Transformer.fabricator,
  },
  {
    input: [{
      item: Item.copperIngot,
      count: 1,
    }],
    output: {
      item: Item.wire,
      count: 2,
    },
    rate: 20,
    transformer: Transformer.fabricator,
  },
  {
    input: [
      {
        item: Item.ironPlate,
        count: 4,
      },
      {
        item: Item.wire,
        count: 8,
      }
    ],
    output: {
      item: Item.artifact,
      count: 1,
    },
    rate: 60,
    transformer: Transformer.combinator,
  },
];

export type SerializedItems = ([Item, number] | number)[];

export const serializeItems = (items: Item[]) => {
  const serialized = items.reduce<SerializedItems>((items, item) => {
    let last = items[items.length - 1];
    const prevItem = Array.isArray(last) ? last[0] : last;
    if (prevItem === item) {
      if (!Array.isArray(last)) {
        items[items.length - 1] = last = [last, 1];
      }
      last[1]++;
    } else {
      items.push(item);
    }
    return items;
  }, []);
  return serialized.length ? serialized : undefined;
};

export const deserializeItems = (items: SerializedItems) => items.reduce<Item[]>((items, item) => {
  if (Array.isArray(item)) {
    for (let i = 0; i < item[1]; i++) {
      items.push(item[0]);
    }
  } else {
    items.push(item);
  }
  return items;
}, []);

class InstancedItems extends InstancedMesh {
  constructor(bounds: Sphere, geometry: BufferGeometry, material: Material, count: number) {
    super(geometry, material, count);
    this.boundingSphere = bounds;
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
    this.instanceMatrix.needsUpdate = true;
    this.visible = true;
  }
}

class Items extends Group {
  private static geometries: Record<Exclude<Item, Item.none>, BufferGeometry> | undefined;
  static setupGeometries() {
    if (!Items.geometries) {
      const csgEvaluator = new Evaluator();

      let brush = new Brush(new BoxGeometry(0.3, 0.3, 0.3));
      brush = csgEvaluator.evaluate(brush, new Brush(new IcosahedronGeometry(0.175, 3)), SUBTRACTION);
      const artifact = mergeVertices(brush.geometry);
      artifact.translate(0, 0.15, 0);
      artifact.computeBoundingSphere();

      const ingot = new BoxGeometry(0.5, 0.125, 0.25);
      ingot.translate(0, 0.0625, 0);
      ingot.computeBoundingSphere();

      const ore = new TetrahedronGeometry(0.2, 2);
      ore.scale(1.5, 1, 1);
      ore.translate(0, 0.2, 0);
      ore.computeBoundingSphere();

      const plate = new BoxGeometry(0.4, 0.0625, 0.4);
      plate.translate(0, 0.03125, 0);
      plate.computeBoundingSphere();

      const rodBrush = new Brush(new CylinderGeometry(0.04, 0.04, 0.5));
      rodBrush.geometry.rotateZ(Math.PI * 0.5);
      rodBrush.geometry.translate(0, 0.04, 0);
      brush = rodBrush.clone();
      rodBrush.position.set(0, 0.08 * 0.9, 0.04 * 0.9);
      rodBrush.updateMatrixWorld();
      brush = csgEvaluator.evaluate(brush, rodBrush, ADDITION);
      rodBrush.position.set(0, 0.08 * 0.9, -0.04 * 0.9);
      rodBrush.updateMatrixWorld();
      brush = csgEvaluator.evaluate(brush, rodBrush, ADDITION);
      rodBrush.position.set(0, 0, 0.08 * 0.9);
      rodBrush.updateMatrixWorld();
      brush = csgEvaluator.evaluate(brush, rodBrush, ADDITION);
      rodBrush.position.set(0, 0, -0.08 * 0.9);
      rodBrush.updateMatrixWorld();
      brush = csgEvaluator.evaluate(brush, rodBrush, ADDITION);
      const rod = mergeVertices(brush.geometry);
      rod.computeBoundingSphere();

      class WireCurve extends Curve<Vector3> {
        constructor() { super(); }
        override getPoint(t: number, optionalTarget = new Vector3()) {
          const r = 6;
          return optionalTarget.set(
            Math.sin(Math.PI * 2 * t * r) * 0.15,
            t * r * 0.04 + (t < (1 / r) ? 0.04 : 0) + (t > (1 - (1 / r)) ? -0.04 : 0),
            Math.cos(Math.PI * 2 * t * r) * 0.15
          );
        }
      }
      const wire = mergeVertices(new TubeGeometry(new WireCurve(), 64, 0.02, 4));
      wire.computeBoundingSphere();

      Items.geometries = {
        [Item.artifact]: artifact,
        [Item.copperIngot]: ingot,
        [Item.copperOre]: ore,
        [Item.ironIngot]: ingot,
        [Item.ironOre]: ore,
        [Item.ironPlate]: plate,
        [Item.ironRod]: rod,
        [Item.wire]: wire,
      };
    }
    return Items.geometries;
  }

  private static materials: Record<Exclude<Item, Item.none>, MeshStandardMaterial> | undefined;
  static setupMaterials() {
    if (!Items.materials) {
      const getMaterial = (diffuse: string, normal: string, roughness: string) => {
        const material = new MeshStandardMaterial({
          map: loadTexture(diffuse),
          normalMap: loadTexture(normal),
          roughnessMap: loadTexture(roughness),
        });
        material.map!.anisotropy = 16;
        material.map!.colorSpace = SRGBColorSpace;
        material.map!.repeat.set(0.2, 0.2);
        [material.map!, material.normalMap!, material.roughnessMap!].forEach((map) => {
          map.wrapS = map.wrapT = RepeatWrapping;
        });
        return material;
      };
      const iron = getMaterial(IronDiffuseMap, IronNormalMap, IronRoughnessMap);
      iron.roughness = 0.7;
      const copper = getMaterial(CopperDiffuseMap, CopperNormalMap, CopperRoughnessMap);
      copper.roughness = 0.7;
      const rust = getMaterial(RustDiffuseMap, RustNormalMap, RustRoughnessMap);
      const wire = new MeshStandardMaterial({
        color: 0,
        roughness: 0.3,
      });
      Items.materials = {
        [Item.artifact]: rust,
        [Item.copperIngot]: copper,
        [Item.copperOre]: copper,
        [Item.ironIngot]: iron,
        [Item.ironOre]: iron,
        [Item.ironPlate]: iron,
        [Item.ironRod]: iron,
        [Item.wire]: wire,
      };
    }
    return Items.materials;
  }

  static getMaterials() {
    Items.setupMaterials();
    const materials: MeshStandardMaterial[] = [];
    for (let key in Items.materials) {
      const material = Items.materials[key as any as Exclude<Item, Item.none>];
      if (!materials.includes(material)) {
        materials.push(material);
      }
    }
    return materials;
  }

  private readonly bounds: Sphere;
  private readonly instances: Partial<Record<Exclude<Item, Item.none>, InstancedItems | undefined>>;
  private readonly path: Curve<Vector3>;
  private readonly tangents: Vector3[];

  constructor(bounds: Sphere, count: number, path: Curve<Vector3>) {
    super();
    this.updateMatrixWorld();
    this.matrixAutoUpdate = false;
    this.renderOrder = 1;
    this.bounds = bounds;
    this.instances = {};
    this.path = path;
    const { tangents } = path.computeFrenetFrames(count, false);
    this.tangents = tangents;
    Items.setupGeometries();
    Items.setupMaterials();
  }

  dispose() {
    (this.children as InstancedItems[]).forEach((items) => items.dispose());
  }

  private static aux: Vector3 = new Vector3();
  private static transform: Object3D = new Object3D();
  animate(slots: { item: Item; locked: boolean; }[], step: number) {
    const { bounds, children, instances, path, tangents } = this;
    const count = slots.length;
    (children as InstancedItems[]).forEach((items) => items.reset());
    slots.forEach(({ item, locked }, i) => {
      if (item === Item.none) {
        return;
      }
      if (!instances[item]) {
        instances[item] = new InstancedItems(bounds, Items.geometries![item], Items.materials![item], count);
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
