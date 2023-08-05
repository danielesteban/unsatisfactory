import { writable } from 'svelte/store';
import { Brush } from '../../core/brush';

const stored = localStorage.getItem('hotbar');
let parsed: Brush[] | undefined;
if (stored) {
  try {
    parsed = JSON.parse(stored) as Brush[];
  } catch (e) {
    parsed = undefined;
  }
}
const { subscribe, update } = writable(parsed || Array.from({ length: 4 }, () => Brush.none));

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
      slots = slots.slice(0, slots.reduce((m, b, i) => Math.max(m, b !== Brush.none ? i : 0), 3) + 1);
      localStorage.setItem('hotbar', JSON.stringify(slots));
      return slots;
    });
  },
};
