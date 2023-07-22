import {
  Vector3,
} from 'three';
import { Item } from '../objects/items';

class Container {
  public readonly position: Vector3;
  public readonly rotation: number;
  protected readonly capacity: number;
  protected readonly consumption: number;
  protected readonly items: Item[];
  protected powered: boolean;

  constructor(position: Vector3, rotation: number, capacity: number, consumption: number = 0, items: Item[] = []) {
    this.position = position;
    this.rotation = rotation;
    this.capacity = capacity;
    this.consumption = consumption;
    this.items = items;
    this.powered = false;
  }

  count() {
    const { items } = this;
    return items.length;
  }

  canInput() {
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

  protected static worldUp: Vector3 = new Vector3(0, 1, 0);
  getWireConnector(): Vector3 {
    return this.position.clone().addScaledVector(Container.worldUp, 1.5);
  }

  needsPower() {
    return this.powered ? 0 : this.consumption;
  }

  setPower(status: boolean) {
    this.powered = status;
  }
};

export type Connector = {
  container: Container;
  direction: Vector3;
};

export default Container;
