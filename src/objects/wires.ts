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
    from.addConnection(to);
    to.addConnection(from);
  }

  dispose() {
    const { geometry, from, to } = this;
    geometry.dispose();
    from.removeConnection(to);
    to.removeConnection(from);
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

  private readonly grid: {
    containers: PoweredContainer[];
    generators: Generator[];
  };

  constructor() {
    super();
    this.matrixAutoUpdate = false;
    this.updateMatrixWorld();
    this.updatePower = this.updatePower.bind(this);
    this.grid = {
      containers: [],
      generators: [],
    };
  }
  
  create(from: PoweredContainer, to: PoweredContainer) {
    const { grid } = this;
    [from, to].forEach((container) => {
      if (container.getConnections().length > 0) {
        return;
      }
      container.addEventListener('enabled', this.updatePower);
      if (container instanceof Generator) {
        grid.generators.push(container);
      } else {
        grid.containers.push(container);
      }
    });
    const wire = new Wire(Wires.getMaterial(), from, to);
    this.add(wire);
    this.updatePower();
    return wire;
  }

  override remove(wire: Wire) {
    const { grid } = this;
    super.remove(wire);
    wire.dispose();
    [wire.from, wire.to].forEach((container) => {
      if (container.getConnections().length > 0) {
        return;
      }
      if (container.getConsumption()) {
        container.setPowered(false);
      }
      container.removeEventListener('enabled', this.updatePower);
      let map;
      if (container instanceof Generator) {
        map = grid.generators;
      } else {
        map = grid.containers;
      }
      const index = map.indexOf(container);
      if (index) {
        map.splice(index, 1);
      }
    });
    this.updatePower();
    return this;
  }

  updatePower() {
    const { grid } = this;
    grid.containers.forEach((container) => {
      if (container.getConsumption()) {
        container.setPowered(false);
      }
    });
    grid.generators.forEach((generator) => {
      let available = generator.getPower();
      const visited = new Map();
      const flow = (connections: PoweredContainer[]) => (
        connections.forEach((container) => {
          if (container instanceof Generator || visited.has(container)) {
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
          flow(container.getConnections());
        })
      );
      flow(generator.getConnections());
    });
  }
}

export default Wires;
