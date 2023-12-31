import {
  BufferGeometry,
  CubicBezierCurve3,
  Group,
  Material,
  Mesh,
  TubeGeometry,
  Vector3,
} from 'three';
import { PoweredContainer } from '../core/container';
import { Brush, Building } from '../core/data';
import Generator from '../core/generator';
import { WireMaterial } from '../core/materials';
import Alerts, { Alert } from '../ui/stores/alerts';
import Inventory from '../ui/stores/inventory';

export class Wire extends Mesh {
  public readonly from: PoweredContainer;
  public readonly to: PoweredContainer;

  constructor({ geometry, position }: { geometry: BufferGeometry, position: Vector3 }, material: Material, from: PoweredContainer, to: PoweredContainer) {
    super(geometry, material);
    this.castShadow = this.receiveShadow = true;
    this.geometry.computeBoundingSphere();
    this.position.copy(position);
    this.updateMatrixWorld();
    this.matrixAutoUpdate = false;
    this.from = from;
    this.to = to;
    from.addWire(this);
    to.addWire(this);
  }

  dispose() {
    const { geometry, from, to } = this;
    geometry.dispose();
    from.removeWire(this);
    to.removeWire(this);
  }
}

class Wires extends Group {
  static getGeometry(from: PoweredContainer, to: PoweredContainer) {
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
    const position = (new Vector3()).addVectors(fromConnector, toConnector).multiplyScalar(0.5);
    fromConnector.sub(position);
    toConnector.sub(position);
    const path = new CubicBezierCurve3(
      fromConnector,
      fromConnector.clone().addScaledVector(fromDirection, offset),
      toConnector.clone().addScaledVector(toDirection, offset),
      toConnector
    );
    const segments = Math.ceil(path.getLength() / 0.1);
    const geometry = new TubeGeometry(path, segments, 0.0625, 4, false);
    return { geometry, position };
  }

  static getMaterial() {
    return WireMaterial;
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

  canAfford() {
    return !this.getCost().find(({ item, count }) => !Inventory.canOutput(item, count));
  }

  private static readonly cost = Building[Brush.wire]!;
  getCost() {
    return Wires.cost;
  }

  create(from: PoweredContainer, to: PoweredContainer, withCost: boolean = true) {
    const { grid } = this;
    [from, to].forEach((container) => {
      if (container.getConnections().length > 0) {
        return;
      }
      container.addEventListener('enabled', this.updatePower);
      if (container instanceof Generator) {
        container.addEventListener('generating', this.updatePower);
        grid.generators.push(container);
      } else {
        grid.containers.push(container);
      }
    });
    const wire = new Wire(Wires.getGeometry(from, to), Wires.getMaterial(), from, to);
    this.add(wire);
    this.updatePower();
    if (withCost) {
      this.getCost().forEach(({ item, count }) => Inventory.output(item, count));
    }
    return wire;
  }

  override remove(wire: Wire) {
    const { grid } = this;
    super.remove(wire);
    this.getCost().forEach(({ item, count }) => Inventory.input(item, count));
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
        container.removeEventListener('generating', this.updatePower);
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

  private isUpdatingPower: boolean = false;
  updatePower() {
    const { grid } = this;
    if (this.isUpdatingPower) {
      return;
    }
    this.isUpdatingPower = true;
    // @dani
    // Defer to the end of the frame
    // So it happens only once
    new Promise(() => {
      this.isUpdatingPower = false;
      grid.containers.forEach((container) => {
        if (container.getConsumption()) {
          container.setPowered(false);
        }
      });
      // @dani @incomplete
      // This code needs a rewrite. It works for now,
      // but it won't scale and it gets worse with every generator you add.
      // Specially if you wire them all together.
      // Also it runs every time you enable/disable a machine etc.
      //
      // This should change into a Grid base system.
      // Updating the grid only at connection/disconnection time,
      // creating or merging existing grids if needed.
      const overloaded = new Set<PoweredContainer>();
      grid.generators.forEach((generator) => {
        let available = generator.getPower();
        const visited = new WeakSet<PoweredContainer>([generator]);
        const flow = (connections: PoweredContainer[]) => (
          connections.forEach((container) => {
            if (visited.has(container)) {
              return;
            }
            visited.add(container);
            if (
              container.getConsumption()
              && container.isEnabled()
              && !container.isPowered()
            ) {
              const required = container.getConsumption();
              if (required > available) {
                overloaded.add(container);
              } else {
                available -= required;
                container.setPowered(true);
                overloaded.delete(container);
              }
            }
            flow(container.getConnections());
          })
        );
        flow(generator.getConnections());
        generator.setAvailable(available);
      });
      Alerts.set(Alert.overloaded, overloaded.size > 0);
    });
  }
}

export default Wires;
