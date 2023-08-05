import {
  BaseEvent,
  Object3D,
  Vector3,
} from 'three';
import { Instance } from './instances';
import { Item } from '../objects/items';

class Container<Events extends BaseEvent = BaseEvent> extends Instance<Events> {
  protected readonly capacity: number;
  protected readonly items: Item[];

  constructor(position: Vector3, rotation: number, capacity: number, items: Item[] = []) {
    super(position, rotation);
    this.capacity = capacity;
    this.items = items;
  }

  canInput(_item: Item) {
    const { capacity, items } = this;
    return items.length < capacity;
  }

  input(item: Item) {
    const { items } = this;
    if (item !== Item.none) {
      items.unshift(item);
    }
  }

  output() {
    const { items } = this;
    return items.pop() || Item.none;
  }

  getConnector(direction: Vector3, offset: Vector3) {
    return this.position.clone().addScaledVector(direction, 0.75).add(offset);
  }
};

export class PoweredContainer<Events extends BaseEvent = BaseEvent> extends Container<
  {
    type: "enabled";
    status: boolean;
  }
  | {
    type: "powered";
    status: boolean;
  }
  | Events
> {
  protected connections: PoweredContainer[];
  protected readonly consumption: number;
  protected readonly maxConnections: number;
  protected enabled: boolean;
  protected powered: boolean;

  constructor(position: Vector3, rotation: number, capacity: number, consumption: number, maxConnections: number = 1, items: Item[] = []) {
    super(position, rotation, capacity, items);
    this.connections = [];
    this.consumption = consumption;
    this.maxConnections = maxConnections;
    this.enabled = true;
    this.powered = false;
  }

  canWire() {
    return this.connections.length < this.maxConnections;
  }

  addConnection(container: PoweredContainer) {
    this.connections.push(container);
  }

  removeConnection(container: PoweredContainer) {
    const index = this.connections.indexOf(container);
    if (index !== -1) {
      this.connections.splice(index, 1);
    }
  }

  getConnections() {
    return this.connections;
  }

  override canInput(item: Item) {
    return this.enabled && super.canInput(item);
  }

  getWireConnector(): Vector3 {
    return this.position.clone().addScaledVector(Object3D.DEFAULT_UP, 1.5);
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
