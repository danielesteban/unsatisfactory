import {
  CubicBezierCurve3,
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
import { Connector } from '../core/container';
import Items, { Item } from './items';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/green_metal_rust_diff_1k.webp';
import NormalMap from '../textures/green_metal_rust_nor_gl_1k.webp';
import RoughnessMap from '../textures/green_metal_rust_rough_1k.webp';

export class Belt extends Mesh {
  public readonly from: Connector;
  public readonly to: Connector;

  private enabled: boolean;
  private readonly items: Items;
  private readonly slots: { item: Item; locked: boolean; }[];

  private static readonly offset: Vector3 = new Vector3(0, -0.5, 0);
  constructor(material: Material, shape: Shape, from: Connector, to: Connector) {
    const fromConnector = from.container.getConnector(from.direction, Belt.offset);
    const toConnector = to.container.getConnector(to.direction, Belt.offset);
    const offset = fromConnector.distanceTo(toConnector) * 0.3;
    const path = new CubicBezierCurve3(
      fromConnector,
      fromConnector.clone().addScaledVector(from.direction, offset),
      toConnector.clone().addScaledVector(to.direction, offset),
      toConnector
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
    const geometry = new ExtrudeGeometry(shape, { extrudePath: path, steps: segments });
    super(geometry, material);
    this.castShadow = this.receiveShadow = true;
    this.updateMatrixWorld();
    this.matrixAutoUpdate = false;
    this.from = { container: from.container, direction: from.direction.clone() };
    this.to = { container: to.container, direction: to.direction.clone() };
    this.enabled = true;
    this.slots = Array.from({ length: Math.ceil(path.getLength() / 0.5) }, () => ({ item: Item.none, locked: false }));
    this.items = new Items(this.slots.length, path);
    this.add(this.items);
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

  animate(step: number) {
    const { enabled, items, slots } = this;
    if (enabled) {
      items.animate(slots, step);
    }
  }

  isEnabled() {
    return this.enabled;
  }

  step() {
    const { from, to, slots } = this;
    const output = slots[slots.length - 1];
    if (output.item !== Item.none && to.container.canInput(output.item)) {
      to.container.input(output.item);
      output.item = Item.none;
      this.enabled = true;
    }

    if (this.enabled) {
      let isSaturated = true;
      for (let i = slots.length - 1; i > 0; i--) {
        if (slots[i].item === Item.none && slots[i - 1].item !== Item.none) {
          slots[i].item = slots[i - 1].item;
          slots[i].locked = false;
          slots[i - 1].item = Item.none;
          isSaturated = false;
        } else {
          slots[i].locked = true;
        }
      }
      if (slots[0].item === Item.none) {
        slots[0].item = from.container.output(this);
        slots[0].locked = false;
        isSaturated = false;
      }
      if (isSaturated) {
        this.enabled = false;
      }
    }
  }
}

class Belts extends Group {
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

  private timer: number;

  constructor() {
    super();
    this.matrixAutoUpdate = false;
    this.updateMatrixWorld();
    this.timer = 0;
  }

  create(from: Connector, to: Connector) {
    const belt = new Belt(Belts.getMaterial(), Belts.getShape(), from, to);
    this.add(belt);
    return belt;
  }
  
  override remove(belt: Belt) {
    super.remove(belt);
    belt.dispose();
    return this;
  }

  step(delta: number) {
    this.timer += delta;
    const rate = 1 / 5;
    while (this.timer > rate) {
      this.timer -= rate;
      (this.children as Belt[]).forEach((belt) => belt.step());
    }
    const step = this.timer / rate;
    (this.children as Belt[]).forEach((belt) => belt.animate(step));
  }
}

export default Belts;
