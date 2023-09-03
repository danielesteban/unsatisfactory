import { writable } from 'svelte/store';

export enum Achievement {
  deposit = 1,
  build,
  miner,
  generator,
  power,
  smelter,
  fabricator,
  combinator,
  points,
  aggregator,
  inventory,
}

let achievements: Set<Achievement> = new Set();
const { subscribe, set } = writable<Set<Achievement>>(achievements);

export default {
  subscribe,
  complete(achievement: Achievement) {
    if (achievements.has(achievement)) {
      return;
    }
    achievements.add(achievement);
    set(achievements);
  },
  serialize() {
    return [...achievements];
  },
  deserialize(serialized: Achievement[]) {
    achievements = new Set(serialized);
    set(achievements);
  },
};
