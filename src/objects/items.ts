import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Curve,
  CylinderGeometry,
  DynamicDrawUsage,
  InstancedMesh,
  Group,
  Material,
  Matrix3,
  Matrix4,
  MeshStandardMaterial,
  Object3D,
  Sphere,
  TetrahedronGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ADDITION, SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
import { CopperMaterial, IronMaterial, RustMaterial, WireMaterial } from '../core/materials';

export enum Item {
  none,
  wire,
  ironPlate,
  ironIngot,
  ironOre,
  rotor,
  copperIngot,
  copperOre,
  ironRod,
  frame,
  computer,
}

export const ItemName = {
  [Item.none]: 'None',
  [Item.computer]: 'Computer',
  [Item.copperIngot]: 'Copper Ingot',
  [Item.copperOre]: 'Copper Ore',
  [Item.frame]: 'Frame',
  [Item.ironIngot]: 'Iron Ingot',
  [Item.ironOre]: 'Iron Ore',
  [Item.ironPlate]: 'Iron Plate',
  [Item.ironRod]: 'Iron Rod',
  [Item.rotor]: 'Rotor',
  [Item.wire]: 'Wire',
};

export const Mining: Partial<Record<Item, { consumption: number; count: number; rate: number; }>> = {
  [Item.copperOre]: { consumption: 100, count: 20, rate: 20 },
  [Item.ironOre]: { consumption: 100, count: 20, rate: 20 },
};

export const Sinking: Partial<Record<Item, number>> = {
  [Item.computer]: 64,
  [Item.copperIngot]: 2,
  [Item.frame]: 32,
  [Item.ironIngot]: 2,
  [Item.ironPlate]: 6,
  [Item.ironRod]: 4,
  [Item.rotor]: 32,
  [Item.wire]: 4,
};

export enum Transformer {
  aggregator,
  combinator,
  fabricator,
  smelter,
}

export const TransformerName = {
  [Transformer.aggregator]: 'Aggregator',
  [Transformer.combinator]: 'Combinator',
  [Transformer.fabricator]: 'Fabricator',
  [Transformer.smelter]: 'Smelter',
};

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
        item: Item.ironRod,
        count: 3,
      },
      {
        item: Item.wire,
        count: 6,
      }
    ],
    output: {
      item: Item.rotor,
      count: 1,
    },
    rate: 30,
    transformer: Transformer.combinator,
  },
  {
    input: [
      {
        item: Item.ironPlate,
        count: 12,
      },
      {
        item: Item.ironRod,
        count: 12,
      }
    ],
    output: {
      item: Item.frame,
      count: 1,
    },
    rate: 60,
    transformer: Transformer.combinator,
  },
  {
    input: [
      {
        item: Item.frame,
        count: 2,
      },
      {
        item: Item.rotor,
        count: 2,
      },
      {
        item: Item.wire,
        count: 24,
      }
    ],
    output: {
      item: Item.computer,
      count: 1,
    },
    rate: 120,
    transformer: Transformer.aggregator,
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
  constructor(bounds: Sphere, geometry: BufferGeometry, material: Material | Material[], count: number) {
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
  private static geometries: Record<Exclude<Item, Item.none>, BufferGeometry>;
  static setupGeometries() {
    if (!Items.geometries) {
      const aux = new Vector2();
      const uvTransform = (new Matrix3()).setUvTransform(0, 0, 0.2, 0.2, 0, 0, 0);
      const applyUVTransform = (geometry: BufferGeometry) => {
        const uv = geometry.getAttribute('uv') as BufferAttribute;
        for (let i = 0, l = uv.count; i < l; i++) {
          aux.fromBufferAttribute(uv, i);
          aux.applyMatrix3(uvTransform);
          uv.setXY(i, aux.x, aux.y);
        }
        return geometry;
      };

      const csg = new Evaluator();
      csg.useGroups = false;
      let brush: Brush;

      const ingot = applyUVTransform(new BoxGeometry(0.5, 0.125, 0.25));
      ingot.translate(0, 0.0625, 0);
      ingot.computeBoundingSphere();

      const ore = applyUVTransform(new TetrahedronGeometry(0.2, 2));
      ore.scale(1.5, 1, 1);
      ore.translate(0, 0.2, 0);
      ore.computeBoundingSphere();

      const plate = applyUVTransform(new BoxGeometry(0.4, 0.0625, 0.4));
      plate.translate(0, 0.03125, 0);
      plate.computeBoundingSphere();

      const computerBase = new Brush(new BoxGeometry(0.3, 0.4, 0.3));
      const computerCarving = new Brush(new BoxGeometry(0.125, 0.2, 0.15));
      computerCarving.position.set(0, 0, 0.15);
      computerCarving.updateMatrixWorld();
      brush = csg.evaluate(computerBase, computerCarving, SUBTRACTION);
      computerCarving.position.set(0, 0, -0.15);
      computerCarving.updateMatrixWorld();
      brush = csg.evaluate(brush, computerCarving, SUBTRACTION);
      computerCarving.rotation.set(0, Math.PI * 0.5, 0);
      computerCarving.position.set(0.15, 0, 0);
      computerCarving.updateMatrixWorld();
      brush = csg.evaluate(brush, computerCarving, SUBTRACTION);
      computerCarving.position.set(-0.15, 0, 0);
      computerCarving.updateMatrixWorld();
      brush = csg.evaluate(brush, computerCarving, SUBTRACTION);
      const computer = applyUVTransform(mergeVertices(brush.geometry));
      computer.translate(0, 0.2, 0);
      computer.computeBoundingSphere();

      let frameCap = new Brush(new BoxGeometry(0.36875, 0.03125, 0.36875));
      frameCap = csg.evaluate(frameCap, new Brush(new BoxGeometry(0.30625, 0.03125, 0.30625)), SUBTRACTION);
      frameCap.position.set(0, 0.03125, 0);
      frameCap.updateMatrixWorld();
      brush = frameCap.clone();
      const frameRod = new Brush(new BoxGeometry(0.0625, 0.4, 0.0625));
      frameRod.position.set(-0.16875, 0.2, -0.16875);
      frameRod.updateMatrixWorld();
      brush = csg.evaluate(brush, frameRod, ADDITION);
      frameRod.position.set(0.16875, 0.2, -0.16875);
      frameRod.updateMatrixWorld();
      brush = csg.evaluate(brush, frameRod, ADDITION);
      frameRod.position.set(0.16875, 0.2, 0.16875);
      frameRod.updateMatrixWorld();
      brush = csg.evaluate(brush, frameRod, ADDITION);
      frameRod.position.set(-0.16875, 0.2, 0.16875);
      frameRod.updateMatrixWorld();
      brush = csg.evaluate(brush, frameRod, ADDITION);
      frameCap.position.set(0, 0.36875, 0);
      frameCap.updateMatrixWorld();
      brush = csg.evaluate(brush, frameCap, ADDITION);
      const frame = applyUVTransform(mergeVertices(brush.geometry));
      frame.computeBoundingSphere();

      const rodBrush = new Brush(new CylinderGeometry(0.04, 0.04, 0.5));
      rodBrush.geometry.rotateZ(Math.PI * 0.5);
      rodBrush.geometry.translate(0, 0.04, 0);
      brush = rodBrush.clone();
      rodBrush.position.set(0, 0.08 * 0.9, 0.04 * 0.9);
      rodBrush.updateMatrixWorld();
      brush = csg.evaluate(brush, rodBrush, ADDITION);
      rodBrush.position.set(0, 0.08 * 0.9, -0.04 * 0.9);
      rodBrush.updateMatrixWorld();
      brush = csg.evaluate(brush, rodBrush, ADDITION);
      rodBrush.position.set(0, 0, 0.08 * 0.9);
      rodBrush.updateMatrixWorld();
      brush = csg.evaluate(brush, rodBrush, ADDITION);
      rodBrush.position.set(0, 0, -0.08 * 0.9);
      rodBrush.updateMatrixWorld();
      brush = csg.evaluate(brush, rodBrush, ADDITION);
      const rod = applyUVTransform(mergeVertices(brush.geometry));
      rod.computeBoundingSphere();

      const rotorCap = new Brush(new CylinderGeometry(0.15, 0.15, 0.0625));
      const rotorRod = new Brush(new CylinderGeometry(0.03, 0.03, 0.3));
      rotorCap.position.set(0, -0.11875, 0);
      rotorCap.updateMatrixWorld();
      rotorRod.scale.set(2, 1, 2);
      rotorRod.updateMatrixWorld();
      brush = csg.evaluate(rotorCap, rotorRod, ADDITION);
      rotorCap.position.set(0, 0.11875, 0);
      rotorCap.updateMatrixWorld();
      brush = csg.evaluate(brush, rotorCap, ADDITION);
      rotorRod.scale.setScalar(1);
      for (let i = 0; i < 5; i++) {
        const r = 0.085;
        const a = ((Math.PI * 2) / 5) * i;
        rotorRod.position.set(Math.sin(a) * r, 0, Math.cos(a) * r);
        rotorRod.updateMatrixWorld();
        brush = csg.evaluate(brush, rotorRod, ADDITION);
      }
      const rotor = applyUVTransform(mergeVertices(brush.geometry));
      rotor.translate(0, 0.15, 0);
      rotor.computeBoundingSphere();

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
        [Item.computer]: computer,
        [Item.copperIngot]: ingot,
        [Item.copperOre]: ore,
        [Item.frame]: frame,
        [Item.ironIngot]: ingot,
        [Item.ironOre]: ore,
        [Item.ironPlate]: plate,
        [Item.ironRod]: rod,
        [Item.rotor]: rotor,
        [Item.wire]: wire,
      };
    }
    return Items.geometries;
  }

  private static materials: Record<Exclude<Item, Item.none>, MeshStandardMaterial | MeshStandardMaterial[]>;
  static setupMaterials() {
    if (!Items.materials) {
      Items.materials = {
        [Item.computer]: RustMaterial(),
        [Item.copperIngot]: CopperMaterial(),
        [Item.copperOre]: CopperMaterial(),
        [Item.frame]: IronMaterial(),
        [Item.ironIngot]: IronMaterial(),
        [Item.ironOre]: IronMaterial(),
        [Item.ironPlate]: IronMaterial(),
        [Item.ironRod]: IronMaterial(),
        [Item.rotor]: RustMaterial(),
        [Item.wire]: WireMaterial(),
      };
    }
    return Items.materials;
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
        instances[item] = new InstancedItems(bounds, Items.geometries[item], Items.materials[item], count);
        this.add(instances[item]!);
      }
      const alpha = locked ? 1 : step;
      if (i === (count - 1) && alpha === 1) {
        return;
      }
      path.getPointAt((i + alpha) / count, Items.transform.position);
      Items.transform.lookAt(Items.aux.lerpVectors(tangents[i], tangents[i + 1], alpha).add(Items.transform.position));
      Items.transform.updateMatrix();
      instances[item]!.addInstance(Items.transform.matrix);
    });
    (children as InstancedItems[]).forEach((items) => items.update());
  }
}

export default Items;
