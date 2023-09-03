import { Item } from '../objects/items';

class Inventory {
  private count: number;
  private readonly items: Map<Item, number>;
  private readonly limit: number;
  private readonly listeners: ((slots: { item: Item; count: number; }[]) => void)[];
  private readonly slots: { item: Item; count: number; }[];
  private readonly stack: number;

  constructor(slots: number, stack: number) {
    this.count = 0;
    this.items = new Map();
    this.limit = slots * stack;
    this.listeners = [];
    this.slots = Array.from({ length: slots }, () => ({ item: Item.none, count: 0 }));
    this.stack = stack;
  }

  subscribe(listener: (slots: { item: Item; count: number; }[]) => void) {
    const { listeners, slots } = this;
    listeners.push(listener);
    listener(slots);
    return () => {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      } 
    }
  }

  getCount(item: Item) {
    const { items } = this;
    return items.get(item) || 0;
  }

  getSlot(slot: number) {
    const { slots } = this;
    return slots[slot];
  }

  addToSlot(slot: number, item: Item, count: number = 1) {
    const { slots, stack } = this;
    const s = slots[slot];
    if (s.item !== Item.none && s.item !== item) {
      return count;
    }
    const c = Math.min(count, stack - s.count);
    slots[slot].item = item;
    slots[slot].count += c;
    this.incCount(item, c);
    this.dispatch();
    return count - c;
  }

  getFromSlot(slot: number, count: number = 1) {
    const { slots } = this;
    const s = slots[slot];
    const c = Math.min(count, s.count);
    s.count -= c;
    this.incCount(s.item, -c);
    if (s.count === 0) {
      s.item = Item.none;
    }
    this.dispatch();
    return c;
  }

  canInput(item: Item, count: number = 1) {
    const { slots, stack } = this;
    let remaining = count;
    for (let i = 0, l = slots.length; i < l; i++) {
      let available = 0;
      if (slots[i].item === Item.none) {
        available = stack;
      } else if (slots[i].item === item) {
        available = stack - slots[i].count;
      }
      if (available >= remaining) {
        return true;
      } else {
        remaining -= available;
      }
    }
    return false;
  }

  input(item: Item, count: number = 1) {
    const { slots, stack } = this;
    let slot = slots.findIndex((slot) => slot.item === Item.none || (slot.item === item && slot.count < stack));
    while (count > 0 && slot !== -1) {
      const s = slots[slot];
      const c = Math.min(count, stack - s.count);
      s.item = item;
      s.count += c;
      this.incCount(item, c);
      count -= c;
      slot = slots.findIndex((slot) => slot.item === Item.none || (slot.item === item && slot.count < stack));
    }
    this.dispatch();
    return count;
  }

  canOutput(item: Item, count: number = 1) {
    return this.getCount(item) >= count;
  }

  output(item: Item, count: number = 1) {
    const { slots } = this;
    for (let i = 0, l = slots.length; i < l; i++) {
      if (slots[i].item === item) {
        const available = Math.min(slots[i].count, count);
        slots[i].count -= available;
        this.incCount(item, -available);
        count -= available;
        if (slots[i].count === 0) {
          slots[i].item = Item.none;
        }
        if (count === 0) {
          break;
        }
      }
    }
    this.dispatch();
    return count;
  }

  outputLast() {
    const { slots } = this;
    let item = Item.none;
    const last = slots.findLast(({ item }) => item !== Item.none);
    if (last) {
      item = last.item;
      last.count--;
      this.incCount(item, -1);
      if (last.count === 0) {
        last.item = Item.none;
      }
    }
    this.dispatch();
    return item;
  }

  isEmpty() {
    const { count } = this;
    return count <= 0;
  }

  isFull() {
    const { count, limit } = this;
    return count >= limit;
  }
  
  private dispatch() {
    const { listeners, slots } = this;
    listeners.forEach((listener) => listener(slots));
  }

  private incCount(item: Item, inc: number) {
    const { items } = this;
    items.set(item, this.getCount(item) + inc);
    this.count += inc;
  }

  serialize() {
    const { slots } = this;
    const last = slots.findLastIndex(({ item }) => item !== Item.none);
    return slots
      .slice(0, last !== -1 ? (last + 1) : 0)
      .map<[Item, number]>(({ item, count }) => [item, count]);
  }

  deserialize(serialized: [Item, number][]) {
    const { items, slots, stack } = this;
    items.clear();
    this.count = 0;
    slots.forEach((slot, i) => {
      if (serialized[i]) {
        const [item, count] = serialized[i];
        slot.item = item;
        slot.count = Math.min(count, stack);
        this.incCount(item, slot.count);
      } else {
        slot.item = Item.none;
        slot.count = 0;
      }
    });
  }
}

export default Inventory;
