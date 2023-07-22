import {
  CubicBezierCurve3,
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
  TubeGeometry,
} from 'three';
import Container from '../core/container';
import { Generator } from './generators';

export class Wire extends Mesh {
  public readonly from: Container;
  public readonly to: Container;

  constructor(material: Material, from: Container, to: Container) {
    const fromConnector = from.getWireConnector();
    const toConnector = to.getWireConnector();
    const direction = toConnector.clone().sub(fromConnector);
    const offset = direction.length() * 0.3;
    direction.normalize();
    const horizontal = direction.clone();
    horizontal.y = 0;
    direction.lerp(horizontal, 0.7);
    const path = new CubicBezierCurve3(
      fromConnector,
      fromConnector.clone().addScaledVector(direction, offset),
      toConnector.clone().addScaledVector(direction.negate(), offset),
      toConnector
    );
    const segments = Math.ceil(path.getLength() / 0.1);
    const geometry = new TubeGeometry(path, segments, 0.0625, 4, false);
    super(geometry, material);
    this.castShadow = this.receiveShadow = true;
    this.updateMatrixWorld();
    this.matrixAutoUpdate = false;
    this.from = from;
    this.to = to;
  }

  dispose() {
    const { geometry } = this;
    geometry.dispose();
  }
}

class Wires extends Group {
  private static material: MeshStandardMaterial | undefined;
  static setupMaterial() {
    Wires.material = new MeshStandardMaterial({
      color: 0,
      roughness: 0.3,
    });
    return Wires.material;
  }

  constructor() {
    if (!Wires.material) {
      Wires.setupMaterial();
    }
    super();
    this.matrixAutoUpdate = false;
    this.updateMatrixWorld();
  }

  create(from: Container, to: Container) {
    const wire = new Wire(Wires.material!, from, to);
    this.add(wire);
    this.updatePower();
    return wire;
  }

  override remove(wire: Wire) {
    super.remove(wire);
    [wire.from, wire.to].forEach((container) => container.setPower(false));
    wire.dispose();
    this.updatePower();
    return this;
  }

  updatePower() {
    const { children } = this;
    const grid = (children as Wire[]).reduce((grid, wire) => {
      [wire.from, wire.to].forEach((container) => {
        const isGenerator = container instanceof Generator;
        const map = isGenerator ? grid.generators : grid.connections;
        let connections = map.get(container);
        if (!connections) {
          connections = [];
          map.set(container, connections);
          if (!isGenerator) {
            container.setPower(false);
          }
        }
        const connected = container === wire.from ? wire.to : wire.from;
        if (!(connected instanceof Generator)) {
          connections.push(connected);
        }
      });
      return grid;
    }, { generators: new Map(), connections: new Map() } as {
      generators: Map<Generator, Container[]>;
      connections: Map<Container, Container[]>;
    });
    grid.generators.forEach((connections, generator) => {
      let available = generator.power;
      const visited = new Map();
      const power = (connections: Container[]) => {
        connections.forEach((container) => {
          if (visited.has(container)) {
            return;
          }
          visited.set(container, true);
          const required = container.needsPower();
          if (required > 0 && required <= available) {
            available -= required;
            container.setPower(true);
          }
          power(grid.connections.get(container)!);
        });
      };
      power(connections);
    });
  }
}

export default Wires;
