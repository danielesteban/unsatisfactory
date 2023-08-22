import {
  BaseEvent,
  Object3D,
  Vector3,
} from 'three';
import Instances, { Instance } from './instances';
import { Belt } from '../objects/belts';
import { Item } from '../objects/items';
import { Wire } from '../objects/wires';

class Container<Events extends BaseEvent = BaseEvent> extends Instance<Events> {
  protected readonly belts: {
    input: Belt[];
    output: Belt[];
  };
  protected readonly capacity: number;
  protected readonly items: Item[];
  protected outputBelt: number;

  constructor(parent: Instances<Instance<Events>>, position: Vector3, rotation: number, capacity: number) {
    super(parent, position, rotation);
    this.belts = { input: [], output: [] };
    this.capacity = capacity;
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

  getConnector(direction: Vector3, offset: Vector3) {
    return this.position.clone().addScaledVector(direction, 0.5).add(offset);
  }

  getBelts() {
    return this.belts;
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

  constructor(parent: Instances<Instance<PoweredContainerEvents | Events>>, position: Vector3, rotation: number, capacity: number, consumption: number, maxConnections: number = 1) {
    super(parent, position, rotation, capacity);
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

  getWireConnector(): Vector3 {
    return this.position.clone().addScaledVector(Object3D.DEFAULT_UP, 2.5);
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

export type Connector = {
  container: Container;
  direction: Vector3;
};

export default Container;
