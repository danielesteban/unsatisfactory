import {
  CubicBezierCurve3,
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  TubeGeometry,
  Vector3,
} from 'three';
import Container, { Connector } from './container';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/green_metal_rust_diff_1k.jpg';
import NormalMap from '../textures/green_metal_rust_nor_gl_1k.jpg';
import RoughnessMap from '../textures/green_metal_rust_rough_1k.jpg';

export class Pipe extends Mesh {
  public readonly from: Container;
  public readonly to: Container;

  private static readonly offset: Vector3 = new Vector3(0, 0, 0);

  constructor(material: Material, from: Connector, to: Connector) {
    const fromConnector = from.container.getConnector(from.direction, Pipe.offset);
    const toConnector = to.container.getConnector(to.direction, Pipe.offset);
    const offset = fromConnector.distanceTo(toConnector) * 0.3;
    const path = new CubicBezierCurve3(
      fromConnector,
      fromConnector.clone().addScaledVector(from.direction, offset),
      toConnector.clone().addScaledVector(to.direction, offset),
      toConnector
    );
    const segments = Math.ceil(path.getLength() / 0.1);
    const geometry = new TubeGeometry(path, segments, 0.125, 8, false);
    super(geometry, material);
    this.castShadow = this.receiveShadow = true;
    this.updateMatrixWorld();
    this.matrixAutoUpdate = false;
    this.from = from.container;
    this.to = to.container;
  }

  dispose() {
    const { geometry } = this;
    geometry.dispose();
  }
}

class Pipes extends Group {
  private static material: MeshStandardMaterial | undefined;
  static setupMaterial() {
    Pipes.material = new MeshStandardMaterial({
      map: loadTexture(DiffuseMap),
      normalMap: loadTexture(NormalMap),
      roughnessMap: loadTexture(RoughnessMap),
      metalness: 0.3,
    });
    Pipes.material.map!.anisotropy = 16;
    Pipes.material.map!.colorSpace = SRGBColorSpace;
    [Pipes.material.map!, Pipes.material.normalMap!, Pipes.material.roughnessMap!].forEach((map) => {
      map.wrapS = map.wrapT = RepeatWrapping;
    });
    return Pipes.material;
  }

  constructor() {
    if (!Pipes.material) {
      Pipes.setupMaterial();
    }
    super();
    this.matrixAutoUpdate = false;
    this.updateMatrixWorld();
  }

  create(from: Connector, to: Connector) {
    const pipe = new Pipe(Pipes.material!, from, to);
    this.add(pipe);
    return pipe;
  }

  override remove(pipe: Pipe) {
    super.remove(pipe);
    pipe.dispose();
    return this;
  }
}

export default Pipes;
