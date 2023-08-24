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
import Instances, { Instance } from './instances';
import { Belt } from '../objects/belts';
import { Item } from '../objects/items';
import { Wire } from '../objects/wires';

export class Connectors extends Group {
  private static defaultGeometry: BufferGeometry | undefined;

  static getDefaultGeometry() {
    if (!Connectors.defaultGeometry) {
      Connectors.defaultGeometry = new BoxGeometry(1.5, 1.5, 0.5);
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
  protected readonly belts: {
    input: Belt[];
    output: Belt[];
  };
  protected readonly capacity: number;
  protected readonly connectors: Connectors;
  protected readonly items: Item[];
  protected outputBelt: number;

  constructor(parent: Instances<Instance<Events>>, connectors: Connectors, position: Vector3, rotation: number, capacity: number) {
    super(parent, position, rotation);
    this.belts = { input: [], output: [] };
    this.capacity = capacity;
    this.connectors = connectors;
    this.items = [];
    this.outputBelt = 0;
  }

  canInput(_item: Item) {
    const { capacity, items } = this;
    return items.length < capacity;
  }

  input(item: Item) {
    const { items } = this;
    items.unshift(item);
  }

  protected getOutput() {
    const { items } = this;
    return items.pop() || Item.none;
  }

  output(belt: Belt) {
    const { belts: { output: belts }, outputBelt } = this;
    if (belts.length <= 1) {
      return this.getOutput();
    }
    const output = (
      outputBelt < belts.length
      && belts[outputBelt] !== belt
      && belts[outputBelt].isEnabled()
    ) ? Item.none : this.getOutput();
    if (output !== Item.none) {
      this.outputBelt = (belts.indexOf(belt) + 1) % belts.length;
    }
    return output;
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
    const { belts } = this;
    belts[type].push(belt);
  }

  removeBelt(belt: Belt, type: 'input' | 'output') {
    const { belts } = this;
    const index = belts[type].indexOf(belt);
    if (index !== -1) {
      belts[type].splice(index, 1);
    }
  }
};

type PoweredContainerEvents = (
  {
    type: "enabled";
    status: boolean;
  }
  | {
    type: "powered";
    status: boolean;
  }
);

export class PoweredContainer<Events extends BaseEvent = BaseEvent> extends Container<
  PoweredContainerEvents | Events
> {
  protected connections: PoweredContainer[];
  protected readonly consumption: number;
  protected enabled: boolean;
  protected readonly maxConnections: number;
  protected powered: boolean;
  protected wires: Wire[];

  constructor(parent: Instances<Instance<PoweredContainerEvents | Events>>, connectors: Connectors, position: Vector3, rotation: number, capacity: number, consumption: number, maxConnections: number = 1) {
    super(parent, connectors, position, rotation, capacity);
    this.connections = [];
    this.consumption = consumption;
    this.enabled = true;
    this.maxConnections = maxConnections;
    this.powered = false;
    this.wires = [];
  }

  override canInput(item: Item) {
    return this.enabled && super.canInput(item);
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
    this.dispatchEvent({ type: 'enabled', status });
  }

  isPowered() {
    return this.powered;
  }

  setPowered(status: boolean) {
    this.powered = status;
    this.dispatchEvent({ type: 'powered', status });
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
