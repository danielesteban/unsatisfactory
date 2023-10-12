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
  Object3D,
  Sphere,
  TetrahedronGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ADDITION, SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
import { Item } from '../core/data';
import {
  BeltMaterial,
  CoalMaterial,
  ConnectorsMaterial,
  CopperMaterial,
  IronMaterial,
  RustMaterial,
  WireMaterial,
} from '../core/materials';

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
  private static setupGeometries() {
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

      let brush: Brush;
      const csg = new Evaluator();

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

      {
        csg.useGroups = true;
        const material = Items.materials[Item.computer];
        const base = new Brush(new BoxGeometry(0.3, 0.4, 0.3), material[0]);
        const carving = new Brush(new BoxGeometry(0.125, 0.2, 0.15), material[1]);
        carving.position.set(0, 0, 0.15);
        carving.updateMatrixWorld();
        brush = csg.evaluate(base, carving, SUBTRACTION);
        carving.position.set(0, 0, -0.15);
        carving.updateMatrixWorld();
        brush = csg.evaluate(brush, carving, SUBTRACTION);
        carving.rotation.set(0, Math.PI * 0.5, 0);
        carving.position.set(0.15, 0, 0);
        carving.updateMatrixWorld();
        brush = csg.evaluate(brush, carving, SUBTRACTION);
        carving.position.set(-0.15, 0, 0);
        carving.updateMatrixWorld();
        brush = csg.evaluate(brush, carving, SUBTRACTION);
      }
      const computer = applyUVTransform(mergeVertices(brush.geometry));
      computer.translate(0, 0.2, 0);
      computer.computeBoundingSphere();

      {
        csg.useGroups = false;
        let cap = new Brush(new BoxGeometry(0.36875, 0.03125, 0.36875));
        cap = csg.evaluate(cap, new Brush(new BoxGeometry(0.30625, 0.03125, 0.30625)), SUBTRACTION);
        cap.position.set(0, 0.03125, 0);
        cap.updateMatrixWorld();
        brush = cap.clone();
        const rod = new Brush(new BoxGeometry(0.0625, 0.4, 0.0625));
        rod.position.set(-0.16875, 0.2, -0.16875);
        rod.updateMatrixWorld();
        brush = csg.evaluate(brush, rod, ADDITION);
        rod.position.set(0.16875, 0.2, -0.16875);
        rod.updateMatrixWorld();
        brush = csg.evaluate(brush, rod, ADDITION);
        rod.position.set(0.16875, 0.2, 0.16875);
        rod.updateMatrixWorld();
        brush = csg.evaluate(brush, rod, ADDITION);
        rod.position.set(-0.16875, 0.2, 0.16875);
        rod.updateMatrixWorld();
        brush = csg.evaluate(brush, rod, ADDITION);
        cap.position.set(0, 0.36875, 0);
        cap.updateMatrixWorld();
        brush = csg.evaluate(brush, cap, ADDITION);
      }
      const frame = applyUVTransform(mergeVertices(brush.geometry));
      frame.computeBoundingSphere();

      {
        csg.useGroups = false;
        const rod = new Brush(new CylinderGeometry(0.04, 0.04, 0.5));
        rod.geometry.rotateZ(Math.PI * 0.5);
        rod.geometry.translate(0, 0.04, 0);
        brush = rod.clone();
        rod.position.set(0, 0.08 * 0.9, 0.04 * 0.9);
        rod.updateMatrixWorld();
        brush = csg.evaluate(brush, rod, ADDITION);
        rod.position.set(0, 0.08 * 0.9, -0.04 * 0.9);
        rod.updateMatrixWorld();
        brush = csg.evaluate(brush, rod, ADDITION);
        rod.position.set(0, 0, 0.08 * 0.9);
        rod.updateMatrixWorld();
        brush = csg.evaluate(brush, rod, ADDITION);
        rod.position.set(0, 0, -0.08 * 0.9);
        rod.updateMatrixWorld();
        brush = csg.evaluate(brush, rod, ADDITION);
      }
      const rod = applyUVTransform(mergeVertices(brush.geometry));
      rod.computeBoundingSphere();

      {
        csg.useGroups = true;
        const material = Items.materials[Item.rotor];
        const cap = new Brush(new CylinderGeometry(0.15, 0.15, 0.0625), material[0]);
        const rod = new Brush(new CylinderGeometry(0.03, 0.03, 0.3), material[0]);
        cap.position.set(0, -0.11875, 0);
        cap.updateMatrixWorld();
        rod.scale.set(2, 1, 2);
        rod.updateMatrixWorld();
        brush = csg.evaluate(cap, rod, ADDITION);
        cap.position.set(0, 0.11875, 0);
        cap.updateMatrixWorld();
        brush = csg.evaluate(brush, cap, ADDITION);
        rod.scale.setScalar(1);
        rod.material = material[1];
        for (let i = 0; i < 5; i++) {
          const r = 0.085;
          const a = ((Math.PI * 2) / 5) * i;
          rod.position.set(Math.sin(a) * r, 0, Math.cos(a) * r);
          rod.updateMatrixWorld();
          brush = csg.evaluate(brush, rod, ADDITION);
        }
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
        [Item.coal]: ore,
        [Item.computer]: computer,
        [Item.copperIngot]: ingot,
        [Item.copperOre]: ore,
        [Item.frame]: frame,
        [Item.ironIngot]: ingot,
        [Item.ironOre]: ore,
        [Item.ironPlate]: plate,
        [Item.ironRod]: rod,
        [Item.rotor]: rotor,
        [Item.steelIngot]: ingot,
        [Item.steelPlate]: plate,
        [Item.wire]: wire,
      };
    }
    return Items.geometries;
  }

  static getGeometry(item: Exclude<Item, Item.none>) {
    return Items.setupGeometries()[item];
  }

  private static readonly materials = {
    [Item.coal]: CoalMaterial,
    [Item.computer]: [RustMaterial, ConnectorsMaterial],
    [Item.copperIngot]: CopperMaterial,
    [Item.copperOre]: CopperMaterial,
    [Item.frame]: IronMaterial,
    [Item.ironIngot]: IronMaterial,
    [Item.ironOre]: IronMaterial,
    [Item.ironPlate]: IronMaterial,
    [Item.ironRod]: IronMaterial,
    [Item.rotor]: [RustMaterial, IronMaterial],
    [Item.steelIngot]: BeltMaterial,
    [Item.steelPlate]: BeltMaterial,
    [Item.wire]: WireMaterial,
  };

  static getMaterial(item: Exclude<Item, Item.none>) {
    return Items.materials[item];
  }

  private readonly bounds: Sphere;
  private readonly instances: Partial<Record<Exclude<Item, Item.none>, InstancedItems | undefined>>;
  private readonly path: Curve<Vector3>;
  private readonly tangents: Vector3[];

  constructor(bounds: Sphere, count: number, path: Curve<Vector3>) {
    super();
    this.updateMatrixWorld();
    this.matrixAutoUpdate = false;
    this.bounds = bounds;
    this.instances = {};
    this.path = path;
    const { tangents } = path.computeFrenetFrames(count, false);
    this.tangents = tangents;
    Items.setupGeometries();
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
