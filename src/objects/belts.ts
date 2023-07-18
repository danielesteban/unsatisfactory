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
import { Container, Connector } from './containers';
import Items from './items';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/green_metal_rust_diff_1k.jpg';
import NormalMap from '../textures/green_metal_rust_nor_gl_1k.jpg';
import RoughnessMap from '../textures/green_metal_rust_rough_1k.jpg';

export class Belt extends Mesh {
  private static offset: Vector3 = new Vector3(0, -0.5, 0);
  public readonly from: Container;
  public readonly to: Container;
  public readonly items?: Items;

  constructor(material: Material, from: Connector, to: Connector) {
    const fromConnector = from.container.position.clone().addScaledVector(from.direction, 0.75).add(Belt.offset);
    const toConnector = to.container.position.clone().addScaledVector(to.direction, 0.75).add(Belt.offset);
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
    const shape = new Shape()
      .moveTo(-0.125, -0.5)
      .lineTo(-0.125, 0.5)
      .lineTo(0.125, 0.5)
      .lineTo(0.125, -0.5)
      .lineTo(-0.125, -0.5);
    const geometry = new ExtrudeGeometry(shape, { extrudePath: path, steps: segments });
    super(geometry, material);
    this.castShadow = this.receiveShadow = true;
    this.updateMatrixWorld();
    this.matrixAutoUpdate = false;
    this.from = from.container;
    this.to = to.container;
    // @dani @hack This should come from the "from" container
    const item = Math.floor(Math.random() * 4);
    if (item) {
      this.items = new Items(item - 1, path);
      this.add(this.items);
    }
  }

  dispose() {
    const { geometry, items } = this;
    geometry.dispose();
    items?.dispose();
  }
}

class Belts extends Group {
  private static material: MeshStandardMaterial | undefined;
  static setupMaterial() {
    Belts.material = new MeshStandardMaterial({
      map: loadTexture(DiffuseMap),
      normalMap: loadTexture(NormalMap),
      roughnessMap: loadTexture(RoughnessMap),
      metalness: 0.5,
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
}

export default Belts;
