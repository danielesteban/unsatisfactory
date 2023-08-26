import RAPIER from '@dimforge/rapier3d-compat';
import {
  BufferGeometry,
  CubicBezierCurve3,
  Curve,
  ExtrudeGeometry,
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  RepeatWrapping,
  Shape,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import Container from '../core/container';
import Physics from '../core/physics';
import Items, { Item } from './items';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/green_metal_rust_diff_1k.webp';
import NormalMap from '../textures/green_metal_rust_nor_gl_1k.webp';
import RoughnessMap from '../textures/green_metal_rust_rough_1k.webp';

export type Connection = {
  container: Container;
  connector: number;
};

export class Belt extends Mesh {
  public readonly from: Connection;
  public readonly to: Connection;

  private isSaturated: boolean;
  private needsUpdate: boolean;
  private readonly items: Items;
  private readonly slots: { item: Item; locked: boolean; }[];

  constructor({ geometry, path }: { geometry: BufferGeometry, path: Curve<Vector3> }, material: Material, from: Connection, to: Connection) {
    super(mergeVertices(geometry), material);
    this.castShadow = this.receiveShadow = true;
    this.updateMatrixWorld();
    this.matrixAutoUpdate = false;
    this.onBeforeRender = this.animate.bind(this);
    this.isSaturated = false;
    this.needsUpdate = true;
    this.slots = Array.from({ length: Math.ceil(path.getLength() / 0.5) }, () => ({ item: Item.none, locked: false }));
    this.items = new Items(this.slots.length, path);
    this.add(this.items);
    this.from = { container: from.container, connector: from.connector };
    this.to = { container: to.container, connector: to.connector };
    from.container.addBelt(this, 'output');
    to.container.addBelt(this, 'input');
  }

  dispose() {
    const { geometry, items, from, to } = this;
    geometry.dispose();
    items.dispose();
    from.container.removeBelt(this, 'output');
    to.container.removeBelt(this, 'input');
  }

  animate() {
    const { isSaturated, items, needsUpdate, slots } = this;
    if (!isSaturated || needsUpdate) {
      this.needsUpdate = false;
      items.animate(slots, isSaturated ? 1 : Belt.animationStep);
    }
  }

  private static animationStep: number = 0;
  static setAnimationStep(step: number) {
    Belt.animationStep = step;
  }

  canInput() {
    return !this.isSaturated;
  }

  hasOutput() {
    const { slots } = this;
    return slots[slots.length - 1].item !== Item.none;
  }

  step() {
    const { from, to, slots } = this;
    const output = slots[slots.length - 1];
    if (output.item !== Item.none && to.container.canInput(output.item, this)) {
      to.container.input(output.item);
      output.item = Item.none;
      this.isSaturated = false;
    }

    if (!this.isSaturated) {
      this.isSaturated = true;
      this.needsUpdate = true;
      for (let i = slots.length - 1; i > 0; i--) {
        if (slots[i].item === Item.none && slots[i - 1].item !== Item.none) {
          slots[i].item = slots[i - 1].item;
          slots[i].locked = false;
          slots[i - 1].item = Item.none;
          this.isSaturated = false;
        } else {
          slots[i].locked = true;
        }
      }
      if (slots[0].item === Item.none) {
        slots[0].item = from.container.output(this);
        slots[0].locked = false;
        this.isSaturated = false;
      }
    }
  }

  getItems() {
    const { slots } = this;
    return slots.filter(({ item }) => item !== Item.none).map(({ item }) => item);
  }

  setItems(items: Item[]) {
    const { slots } = this;
    this.isSaturated = false;
    items = items.slice(0, slots.length).reverse();
    const gap = Math.floor(slots.length / items.length);
    items.forEach((item, i) => {
      slots[slots.length - 1 - i * gap].item = item;
    });
  }
}

class Belts extends Group {
  private static readonly offset: Vector3 = new Vector3(0, -0.5, 0);
  static getGeometry(from: Connection, to: Connection) {
    const fromConnector = from.container.getConnector(from.connector);
    const fromDirection = fromConnector.getWorldDirection(new Vector3());
    const fromPosition = fromConnector
      .getWorldPosition(new Vector3())
      .addScaledVector(fromDirection, -0.5)
      .add(Belts.offset);
    const toConnector = to.container.getConnector(to.connector);
    const toDirection = toConnector.getWorldDirection(new Vector3());
    const toPosition = toConnector
      .getWorldPosition(new Vector3())
      .addScaledVector(toDirection, -0.5)
      .add(Belts.offset);
    const offset = fromPosition.distanceTo(toPosition) * 0.3;
    const path = new CubicBezierCurve3(
      fromPosition,
      fromPosition.clone().addScaledVector(fromDirection, offset),
      toPosition.clone().addScaledVector(toDirection, offset),
      toPosition
    );
    {
      // @dani @hack
      // this is prolly wrong but it seems to work at preventing weird horizontal extrusions
      const { normals, binormals } = path.computeFrenetFrames(1, false);
      if (Math.abs(normals[0].dot(Object3D.DEFAULT_UP)) < Math.abs(binormals[0].dot(Object3D.DEFAULT_UP))) {
        const flipBinormals = binormals[0].dot(Object3D.DEFAULT_UP) > 0;
        const compute = path.computeFrenetFrames.bind(path);
        path.computeFrenetFrames = (steps: number, closed: boolean) => {
          const { normals, binormals, tangents } = compute(steps, closed);
          if (flipBinormals) {
            binormals.forEach((n) => n.negate());
          } else {
            normals.forEach((n) => n.negate());
          }
          return { normals: binormals, binormals: normals, tangents };
        };
      }
    }
    const segments = Math.ceil(path.getLength() / 0.1);
    const geometry = new ExtrudeGeometry(Belts.getShape(), { extrudePath: path, steps: segments });
    return { geometry, path };
  };

  private static material: MeshStandardMaterial | undefined;
  static getMaterial() {
    if (!Belts.material) {
      const material = new MeshStandardMaterial({
        map: loadTexture(DiffuseMap),
        normalMap: loadTexture(NormalMap),
        roughnessMap: loadTexture(RoughnessMap),
        metalness: 0.3,
      });
      material.map!.anisotropy = 16;
      material.map!.colorSpace = SRGBColorSpace;
      [material.map!, material.normalMap!, material.roughnessMap!].forEach((map) => {
        map.wrapS = map.wrapT = RepeatWrapping;
      });
      Belts.material = material;
    }
    return Belts.material;
  }

  private static shape: Shape | undefined;
  static getShape() {
    if (!Belts.shape) {
      const width = 1;
      const height = 0.25;
      const inset = 0.125;
      const hw = width * 0.5;
      const hh = height * 0.5;
      Belts.shape = new Shape()
        .moveTo(-hh, -hw)
        .lineTo(-hh, -hw + inset)
        .lineTo(hh - inset, -hw + inset)
        .lineTo(hh - inset, hw - inset)
        .lineTo(-hh, hw - inset)
        .lineTo(-hh, hw)
        .lineTo(hh, hw)
        .lineTo(hh, -hw)
        .lineTo(-hh, -hw);
    }
    return Belts.shape;
  }

  private readonly physics: Physics;
  private timer: number;

  constructor(physics: Physics) {
    super();
    this.updateMatrixWorld();
    this.matrixAutoUpdate = false;
    this.physics = physics;
    this.timer = 0;
  }

  create(from: Connection, to: Connection) {
    const { physics } = this;
    const belt = new Belt(Belts.getGeometry(from, to), Belts.getMaterial(), from, to);
    this.add(belt);
    physics.addBody(
      belt,
      RAPIER.RigidBodyDesc.fixed(),
      RAPIER.ColliderDesc.trimesh(
        belt.geometry.getAttribute('position').array as Float32Array,
        belt.geometry.getIndex()!.array as Uint32Array
      )!
    );
    return belt;
  }
  
  override remove(belt: Belt) {
    const { physics } = this;
    super.remove(belt);
    belt.dispose();
    physics.removeBody(belt);
    return this;
  }

  step(delta: number) {
    this.timer += delta;
    const rate = 1 / 5;
    while (this.timer > rate) {
      this.timer -= rate;
      (this.children as Belt[]).forEach((belt) => belt.step());
    }
    Belt.setAnimationStep(this.timer / rate);
  }
}

export default Belts;
