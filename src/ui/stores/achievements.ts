import { writable } from 'svelte/store';

const stored = localStorage.getItem('achievements');
let parsed: string[] | undefined;
if (stored) {
  try {
    parsed = JSON.parse(stored) as string[];
  } catch (e) {
    parsed = undefined;
  }
}
parsed = parsed || [];
const { subscribe, update } = writable(parsed);

const map: Map<string, boolean> = new Map();
parsed.forEach((id) => map.set(id, true));

export default {
  subscribe,
  complete(achievement: string) {
    if (map.has(achievement)) {
      return;
    }
    console.log('huh')
    map.set(achievement, true);
    update((achievements) => {
      achievements = [...achievements];
      if (!achievements.includes(achievement)) {
        achievements.push(achievement);
      }
      localStorage.setItem('achievements', JSON.stringify(achievements));
      return achievements;
    });
  },
};
