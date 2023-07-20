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
import Container, { Connector } from './container';
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
  private locked: boolean;
  private readonly items: Items;
  private readonly rate: number;
  private readonly slots: Item[];
  private timer: number;

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
    this.locked = true;
    this.rate = 1 / 5;
    this.slots = Array.from({ length: Math.ceil(path.getLength() / 0.5) }, () => Item.none);
    this.timer = 0;
    this.items = new Items(this.slots.length, path);
    this.add(this.items);
  }

  dispose() {
    const { geometry, items } = this;
    geometry.dispose();
    items.dispose();
  }

  step(delta: number) {
    this.timer += delta;
    const { from, to, items, rate, slots } = this;
    if (this.timer >= rate) {
      this.timer -= rate;
      if (this.locked) {
        // @dani @hack
        // This is to allow other belts to input into a backed up container.
        // Which tells me that the containers should be the ones that pull
        // instead of the belts being the ones that push.
        this.locked = false;
        return;
      }
      if (to.canInput()) {
        slots.unshift(from.output());
        to.input(slots.pop()!);
        this.enabled = true;
        this.locked = !to.canInput();
      } else if (this.enabled) {
        // @dani @incomplete
        // This creates a visual glitch when animating the items backed up at the end of the belt.
        // A possible fix would be tracking the backed up items and making the items animation aware
        // of which items should not be animated.
        let hasMoved = false;
        for (let i = slots.length - 1; i > 0; i--) {
          if (slots[i] === Item.none) {
            slots[i] = slots[i - 1];
            slots[i - 1] = Item.none;
            hasMoved = true;
          }
        }
        if (slots[0] === Item.none) {
          slots[0] = from.output();
          hasMoved = true;
        }
        if (!hasMoved) {
          this.enabled = false;
        }
      }
    }
    if (this.enabled) {
      items.animate(slots, this.timer / rate);
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

  constructor() {
    if (!Belts.material) {
      Belts.setupMaterial();
    }
    super();
    this.matrixAutoUpdate = false;
    this.updateMatrixWorld();
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
    (this.children as Belt[]).forEach((belt) => belt.step(delta));
  }
}

export default Belts;
