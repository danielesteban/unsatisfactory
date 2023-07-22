import {
  CubicBezierCurve3,
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
  TubeGeometry,
} from 'three';
import { PoweredContainer } from '../core/container';
import { Generator } from './generators';

export class Wire extends Mesh {
  public readonly from: PoweredContainer;
  public readonly to: PoweredContainer;

  constructor(material: Material, from: PoweredContainer, to: PoweredContainer) {
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

  create(from: PoweredContainer, to: PoweredContainer) {
    const wire = new Wire(Wires.material!, from, to);
    this.add(wire);
    this.updatePower();
    return wire;
  }

  override remove(wire: Wire) {
    super.remove(wire);
    [wire.from, wire.to].forEach((container) => container.setPowered(false));
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
            container.setPowered(false);
          }
        }
        const connected = container === wire.from ? wire.to : wire.from;
        if (!(connected instanceof Generator)) {
          connections.push(connected);
        }
      });
      return grid;
    }, { generators: new Map(), connections: new Map() } as {
      generators: Map<Generator, PoweredContainer[]>;
      connections: Map<PoweredContainer, PoweredContainer[]>;
    });
    grid.generators.forEach((connections, generator) => {
      let available = generator.power;
      const visited = new Map();
      const flow = (connections: PoweredContainer[]) => (
        connections.forEach((container) => {
          if (visited.has(container)) {
            return;
          }
          visited.set(container, true);
          if (!container.isPowered()) {
            const required = container.getConsumption();
            if (required <= available) {
              available -= required;
              container.setPowered(true);
            }
          }
          flow(grid.connections.get(container)!);
        })
      );
      flow(connections);
    });
  }
}

export default Wires;
