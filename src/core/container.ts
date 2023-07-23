import {
  BaseEvent,
  EventDispatcher,
  Vector3,
} from 'three';
import { Item } from '../objects/items';

class Container<Event extends BaseEvent = BaseEvent> extends EventDispatcher<Event> {
  public readonly position: Vector3;
  public readonly rotation: number;
  protected readonly capacity: number;
  protected readonly items: Item[];

  constructor(position: Vector3, rotation: number, capacity: number, items: Item[] = []) {
    super();
    this.position = position;
    this.rotation = rotation;
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

export type PoweredContainerEvent = BaseEvent & (
  {
    type: 'enabled';
    status: boolean;
  }
  | {
    type: 'powered';
    status: boolean;
  }
);

export class PoweredContainer extends Container<PoweredContainerEvent> {
  protected readonly consumption: number;
  protected enabled: boolean;
  protected powered: boolean;

  constructor(position: Vector3, rotation: number, capacity: number, consumption: number, items: Item[] = []) {
    super(position, rotation, capacity, items);
    this.consumption = consumption;
    this.enabled = true;
    this.powered = false;
  }

  override canInput(item: Item) {
    return this.enabled && super.canInput(item);
  }

  protected static worldUp: Vector3 = new Vector3(0, 1, 0);
  getWireConnector(): Vector3 {
    return this.position.clone().addScaledVector(PoweredContainer.worldUp, 1.5);
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
}

export type Connector = {
  container: Container;
  direction: Vector3;
};

export default Container;
