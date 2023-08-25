import { get, writable } from 'svelte/store';
import Achievements, { Achievement } from './achievements';

const { subscribe, set, update } = writable<number>(0);

export default {
  subscribe,
  increment(count: number) {
    Achievements.complete(Achievement.points);
    update((points) => (
      points + count
    ));
  },
  serialize() {
    return get({ subscribe });
  },
  deserialize(points: number) {
    set(points);
  },
};
