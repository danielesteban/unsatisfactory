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
    const fromDirection = direction.clone();
    const fromDownwards = fromDirection.clone();
    fromDownwards.y = -1;
    fromDownwards.normalize();
    fromDirection.lerp(fromDownwards, 0.3);
    const toDirection = direction.clone().negate();
    const toDownwards = toDirection.clone();
    toDownwards.y = -1;
    toDownwards.normalize();
    toDirection.lerp(toDownwards, 0.3);
    const path = new CubicBezierCurve3(
      fromConnector,
      fromConnector.clone().addScaledVector(fromDirection, offset),
      toConnector.clone().addScaledVector(toDirection, offset),
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
  static getMaterial() {
    if (!Wires.material) {
      Wires.material = new MeshStandardMaterial({
        color: 0,
        roughness: 0.3,
      });
    }
    return Wires.material;
  }

  constructor() {
    super();
    this.matrixAutoUpdate = false;
    this.updateMatrixWorld();
    this.updatePower = this.updatePower.bind(this);
  }

  create(from: PoweredContainer, to: PoweredContainer) {
    const wire = new Wire(Wires.getMaterial(), from, to);
    this.add(wire);
    this.updatePowerGrid();
    return wire;
  }

  override remove(wire: Wire) {
    super.remove(wire);
    wire.dispose();
    this.updatePowerGrid();
    return this;
  }

  private grid?: {
    containers: Map<PoweredContainer, PoweredContainer[]>;
    generators: Map<Generator, PoweredContainer[]>;
  };
  updatePowerGrid() {
    const { children } = this;
    if (this.grid) {
      this.grid.containers.forEach((_connections, container) => {
        if (container.getConsumption()) {
          container.setPowered(false);
        }
        container.removeEventListener('enabled', this.updatePower);
      });
    }
    this.grid = (children as Wire[]).reduce((grid, wire) => {
      [wire.from, wire.to].forEach((container) => {
        const isGenerator = container instanceof Generator;
        const map = isGenerator ? grid.generators : grid.containers;
        let connections = map.get(container);
        if (!connections) {
          connections = [];
          map.set(container, connections);
          container.addEventListener('enabled', this.updatePower);
        }
        const connected = container === wire.from ? wire.to : wire.from;
        if (!(connected instanceof Generator)) {
          connections.push(connected);
        }
      });
      return grid;
    }, { containers: new Map(), generators: new Map() });
    this.updatePower();
  }

  updatePower() {
    const { grid } = this;
    if (!grid) {
      return this.updatePowerGrid();
    }
    grid.containers.forEach((_connections, container) => {
      if (container.getConsumption()) {
        container.setPowered(false);
      }
    });
    grid.generators.forEach((connections, generator) => {
      let available = generator.getPower();
      const visited = new Map();
      const flow = (connections: PoweredContainer[]) => (
        connections.forEach((container) => {
          if (visited.has(container)) {
            return;
          }
          visited.set(container, true);
          if (container.isEnabled() && !container.isPowered()) {
            const required = container.getConsumption();
            if (required <= available) {
              available -= required;
              container.setPowered(true);
            }
          }
          flow(grid.containers.get(container)!);
        })
      );
      flow(connections);
    });
  }
}

export default Wires;
