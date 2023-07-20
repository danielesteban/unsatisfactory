import {
  Vector3,
} from 'three';
import { Item } from './items';

class Container {
  public readonly position: Vector3;
  protected readonly capacity: number;
  protected readonly items: Item[];

  constructor(position: Vector3, capacity: number, items: Item[] = []) {
    this.capacity = capacity;
    this.items = items;
    this.position = position;
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
};

export type Connector = {
  container: Container;
  direction: Vector3;
};

export default Container;
