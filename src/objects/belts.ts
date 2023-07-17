import {
  CubicBezierCurve3,
  Group,
  ExtrudeGeometry,
  Material,
  Mesh,
  MeshStandardMaterial,
  RepeatWrapping,
  Shape,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { Container, Connector } from './containers';
import { loadTexture } from '../textures';
// @ts-ignore
import DiffuseMap from '../textures/green_metal_rust_diff_1k.jpg';
// @ts-ignore
import NormalMap from '../textures/green_metal_rust_nor_gl_1k.jpg';
// @ts-ignore
import RoughnessMap from '../textures/green_metal_rust_rough_1k.jpg';

export class Belt extends Mesh {
  private static offset: Vector3 = new Vector3(0, -0.5, 0);
  public readonly from: Container;
  public readonly to: Container;
  constructor(material: Material, from: Connector, to: Connector) {
    const fromConnector = from.container.position.clone().addScaledVector(from.direction, 1).add(Belt.offset);
    const toConnector = to.container.position.clone().addScaledVector(to.direction, 1).add(Belt.offset);
    const offset = fromConnector.distanceTo(toConnector) * 0.3;
    const path = new CubicBezierCurve3(
      fromConnector,
      fromConnector.clone().addScaledVector(from.direction, offset),
      toConnector.clone().addScaledVector(to.direction, offset),
      toConnector
    );
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
    Belts.material.map!.colorSpace = SRGBColorSpace;
    Belts.material.map!.wrapS = Belts.material.map!.wrapT = RepeatWrapping;
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
    belt.geometry.dispose();
    return this;
  }
}

export default Belts;
