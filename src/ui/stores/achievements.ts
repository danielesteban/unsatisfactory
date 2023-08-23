import { writable } from 'svelte/store';

export enum Achievement {
  deposit = 1,
  build,
  miner,
  generator,
  power,
  smelter,
  fabricator,
  points,
}

const map: Map<Achievement, boolean> = new Map();
const { subscribe, set, update } = writable<Achievement[]>([]);

export default {
  subscribe,
  complete(achievement: Achievement) {
    if (map.has(achievement)) {
      return;
    }
    map.set(achievement, true);
    update((achievements) => ([
      ...achievements,
      ...(!achievements.includes(achievement) ? [achievement] : []),
    ]));
  },
  serialize() {
    return [...map.keys()];
  },
  deserialize(achievements: Achievement[]) {
    map.clear();
    achievements.forEach((achievement) => map.set(achievement, true));
    set(achievements);
  },
};
