import { get, writable } from 'svelte/store';
import { Brush } from '../../core/brush';

const { subscribe, set, update } = writable(Array.from({ length: 4 }, () => Brush.none));

export default {
  subscribe,
  toggle(brush: Brush, slot: number) {
    update((slots) => {
      if (slot >= slots.length) {
        slots = [...slots, ...Array.from({ length: slot - slots.length + 1 }, () => Brush.none)];
      }
      slots = [...slots];
      if (slots[slot] === brush) {
        slots[slot] = Brush.none;
      } else {
        const current = slots.indexOf(brush);
        if (current !== -1) {
          slots[current] = Brush.none;
        }
        slots[slot] = brush;
      }
      const last = slots.findLastIndex((brush) => brush !== Brush.none);
      return slots.slice(0, Math.max(last !== -1 ? (last + 1) : 0, 4));
    });
  },
  serialize() {
    const slots = get({ subscribe });
    const last = slots.findLastIndex((brush) => brush !== Brush.none);
    return slots.slice(0, last !== -1 ? (last + 1) : 0);
  },
  deserialize(slots: Brush[]) {
    if (slots.length < 4) {
      slots = [
        ...slots,
        ...Array.from({ length: 4 - slots.length }, () => Brush.none),
      ];
    }
    set(slots);
  },
};
