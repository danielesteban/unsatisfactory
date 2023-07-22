import {
  CubicBezierCurve3,
  ExtrudeGeometry,
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
  RepeatWrapping,
  Shape,
  SRGBColorSpace,
  Vector3,
} from 'three';
import Container, { Connector } from '../core/container';
import Items, { Item } from './items';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/green_metal_rust_diff_1k.jpg';
import NormalMap from '../textures/green_metal_rust_nor_gl_1k.jpg';
import RoughnessMap from '../textures/green_metal_rust_rough_1k.jpg';

export class Belt extends Mesh {
  private static shape: Shape | undefined;
  static setupShape() {
    const width = 1;
    const height = 0.25;
    const inset = 0.125;
    const hw = width * 0.5;
    const hh = height * 0.5;
    Belt.shape = new Shape()
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

  private static readonly offset: Vector3 = new Vector3(0, -0.5, 0);
  public readonly from: Container;
  public readonly to: Container;

  private enabled: boolean;
  private readonly items: Items;
  private readonly slots: { item: Item; locked: boolean; }[];

  constructor(material: Material, from: Connector, to: Connector) {
    if (!Belt.shape) {
      Belt.setupShape();
    }
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
      const worldUp = new Vector3(0, 1, 0);
      const { normals, binormals } = path.computeFrenetFrames(1, false);
      if (Math.abs(normals[0].dot(worldUp)) < Math.abs(binormals[0].dot(worldUp))) {
        const flipBinormals = binormals[0].dot(worldUp) > 0;
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
    const geometry = new ExtrudeGeometry(Belt.shape, { extrudePath: path, steps: segments });
    super(geometry, material);
    this.castShadow = this.receiveShadow = true;
    this.updateMatrixWorld();
    this.matrixAutoUpdate = false;
    this.from = from.container;
    this.to = to.container;
    this.enabled = true;
    this.slots = Array.from({ length: Math.ceil(path.getLength() / 0.5) }, () => ({ item: Item.none, locked: false }));
    this.items = new Items(this.slots.length, path);
    this.add(this.items);
  }

  dispose() {
    const { geometry, items } = this;
    geometry.dispose();
    items.dispose();
  }

  animate(step: number) {
    const { enabled, items, slots } = this;
    if (enabled) {
      items.animate(slots, step);
    }
  }

  step() {
    const { from, to, slots } = this;
    const output = slots[slots.length - 1];
    if (output.item !== Item.none && to.canInput(output.item)) {
      to.input(output.item);
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
        slots[0].item = from.output();
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
  static setupMaterial() {
    Belts.material = new MeshStandardMaterial({
      map: loadTexture(DiffuseMap),
      normalMap: loadTexture(NormalMap),
      roughnessMap: loadTexture(RoughnessMap),
      metalness: 0.3,
    });
    Belts.material.map!.anisotropy = 16;
    Belts.material.map!.colorSpace = SRGBColorSpace;
    [Belts.material.map!, Belts.material.normalMap!, Belts.material.roughnessMap!].forEach((map) => {
      map.wrapS = map.wrapT = RepeatWrapping;
    });
    return Belts.material;
  }

  private timer: number;

  constructor() {
    if (!Belts.material) {
      Belts.setupMaterial();
    }
    super();
    this.matrixAutoUpdate = false;
    this.updateMatrixWorld();
    this.timer = 0;
  }

  create(from: Connector, to: Connector) {
    const belt = new Belt(Belts.material!, from, to);
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
