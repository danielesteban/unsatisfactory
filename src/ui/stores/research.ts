import { writable } from 'svelte/store';

let researching: Set<number> = new Set();
const { subscribe, set } = writable<Set<number>>(researching);

export default {
  subscribe,
  complete(research: number) {
    if (researching.has(research)) {
      return;
    }
    researching.add(research);
    set(researching);
  },
  serialize() {
    return [...researching];
  },
  deserialize(serialized: number[]) {
    researching = new Set(serialized);
    set(researching);
  },
};
