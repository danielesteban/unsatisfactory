import {
  BaseEvent,
  BoxGeometry,
  BufferGeometry,
  Group,
  Mesh,
  Object3D,
  Raycaster,
  Vector3,
} from 'three';
import { Instance } from './instances';
import { Belt } from '../objects/belts';
import { Item } from '../objects/items';
import { Wire } from '../objects/wires';

export class Connectors extends Group {
  private static defaultGeometry: BufferGeometry | undefined;
  static getDefaultGeometry() {
    if (!Connectors.defaultGeometry) {
      Connectors.defaultGeometry = new BoxGeometry(1.5, 1.5, 0.25);
      Connectors.defaultGeometry.translate(0, 0, -0.125);
      Connectors.defaultGeometry.computeBoundingSphere();
    }
    return Connectors.defaultGeometry;
  }

  constructor(connectors: { geometry?: BufferGeometry; position: Vector3; rotation?: number; }[]) {
    super();
    connectors.forEach(({ geometry, position, rotation }) => {
      const connector = new Mesh(geometry || Connectors.getDefaultGeometry());
      connector.position.copy(position);
      connector.rotation.y = rotation || 0;
      connector.updateMatrix();
      connector.matrixAutoUpdate = false;
      this.add(connector);
    });
  }
}

class Container<Events extends BaseEvent = BaseEvent> extends Instance<Events> {
  private readonly belts: {
    input: Belt[];
    output: Belt[];
  };
  private readonly connectors: Connectors;
  private readonly splitter: {
    input: number;
    output: number;
  };

  constructor(connectors: Connectors, position: Vector3, rotation: number) {
    super(position, rotation);
    this.belts = { input: [], output: [] };
    this.connectors = connectors;
    this.splitter = { input: 0, output: 0 };
  }

  protected acceptsInput(_item: Item) {
    return this.canInput();
  }

  protected canInput() {
    return false;
  }

  protected input(_item: Item) {

  }

  protected canOutput() {
    return false;
  }

  protected output() {
    return Item.none;
  }

  protected getConnectors() {
    const { connectors, position, rotation } = this;
    connectors.position.copy(position);
    connectors.rotation.y = rotation;
    connectors.updateMatrixWorld();
    return connectors;
  }

  intersectConnector(raycaster: Raycaster, maxDistance: number = Infinity) {
    const connectors = this.getConnectors();
    const { far } = raycaster;
    raycaster.far = maxDistance;
    const hit = raycaster.intersectObject(connectors)[0];
    raycaster.far = far;
    if (hit) {
      return connectors.children.indexOf(hit.object);
    }
    return false;
  }

  getConnector(index: number) {
    return this.getConnectors().children[index] as Mesh;
  }

  getBelts() {
    return this.belts;
  }

  canBelt(connector: number, container?: Container): boolean {
    const { belts } = this;
    return (
      container !== this
      && !(
        belts.input.find(({ to }) => to.connector === connector)
        || belts.output.find(({ from }) => from.connector === connector)
      )
    );
  }

  addBelt(belt: Belt, type: 'input' | 'output') {
    const { belts, splitter } = this;
    belts[type].push(belt);
    splitter[type] = 0;
  }

  removeBelt(belt: Belt, type: 'input' | 'output') {
    const { belts, splitter } = this;
    const index = belts[type].indexOf(belt);
    if (index !== -1) {
      belts[type].splice(index, 1);
    }
    splitter[type] = 0;
  }

  stepInput() {
    const { belts, splitter } = this;
    if (!this.canInput()) {
      return;
    }
    for (let i = 0; i < belts.input.length; i++) {
      let belt;
      const output = belts.input[splitter.input].peek();
      if (output !== Item.none && this.acceptsInput(output)) {
        belt = belts.input[splitter.input];
      }
      splitter.input = (splitter.input + 1) % belts.input.length;
      if (belt) {
        this.input(belt.output());
        if (!this.canInput()) {
          return;
        }
      }
    }
  }

  stepOutput() {
    const { belts, splitter } = this;
    if (!this.canOutput()) {
      return;
    }
    for (let i = 0; i < belts.output.length; i++) {
      let belt;
      if (belts.output[splitter.output].canInput()) {
        belt = belts.output[splitter.output];
      }
      splitter.output = (splitter.output + 1) % belts.output.length;
      if (belt) {
        belt.input(this.output());
        if (!this.canOutput()) {
          return;
        }
      }
    }
  }
};

type PoweredContainerEvents = (
  { type: 'enabled'; }
  | { type: 'powered'; }
);

export class PoweredContainer<Events extends BaseEvent = BaseEvent> extends Container<
  PoweredContainerEvents | Events
> {
  private static readonly enabledEvent: { type: 'enabled' } = { type: 'enabled' };
  private static readonly poweredEvent: { type: 'powered' } = { type: 'powered' };

  // @dani @incomplete
  // This is now confusing AF because there's also a connectors on Container.
  // Maybe rename to electricalConnections or wiring?
  protected connections: PoweredContainer[];
  protected readonly consumption: number;
  protected enabled: boolean;
  protected readonly maxConnections: number;
  protected powered: boolean;
  protected wires: Wire[];

  constructor(connectors: Connectors, position: Vector3, rotation: number, consumption: number, maxConnections: number = 1) {
    super(connectors, position, rotation);
    this.connections = [];
    this.consumption = consumption;
    this.enabled = true;
    this.maxConnections = maxConnections;
    this.powered = false;
    this.wires = [];
  }

  getWireConnector() {
    return this.position.clone()
      .addScaledVector(Object3D.DEFAULT_UP, 2.5);
  }

  getConsumption() {
    return this.consumption;
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(status: boolean) {
    this.enabled = status;
    this.dispatchEvent(PoweredContainer.enabledEvent);
  }

  isPowered() {
    return this.powered;
  }

  setPowered(status: boolean) {
    this.powered = status;
    this.dispatchEvent(PoweredContainer.poweredEvent);
  }

  getConnections() {
    return this.connections;
  }

  getWires() {
    return this.wires;
  }

  canWire(container?: PoweredContainer) {
    const { connections, maxConnections } = this;
    return (
      connections.length < maxConnections
      && (
        !container
        || (container !== this && !connections.includes(container))
      )
    );
  }

  addWire(wire: Wire) {
    const { connections, wires } = this;
    wires.push(wire);
    connections.push(wire.from === this ? wire.to : wire.from);
  }

  removeWire(wire: Wire) {
    const { connections, wires } = this;
    let index = wires.indexOf(wire);
    if (index !== -1) {
      wires.splice(index, 1);
      index = connections.indexOf(wire.from === this ? wire.to : wire.from);
      if (index !== -1) {
        connections.splice(index, 1);
      }
    }
  }

  override serialize() {
    const { enabled } = this;
    return [
      ...super.serialize(),
      enabled ? 1 : 0,
    ];
  }
}

export default Container;
