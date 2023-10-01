import { get, writable } from 'svelte/store';
import { Vector3 } from 'three';
import { Item } from '../../core/data';
import Terrain, { TerrainChunk } from '../../objects/terrain';
import { ping } from '../../sounds';
import Achievements, { Achievement } from './achievements';
import Settings from './settings';

type ScannerResult = { item: Exclude<Item, Item.none>, position: Vector3 };

let isRunning = false;
let timer = 0;
const sfx = new Audio(ping);
sfx.volume = 0.2;

const { subscribe, set } = writable<{
  isRunning: boolean;
  progress: number;
  results: ScannerResult[];
}>({
  isRunning: false,
  progress: 0,
  results: [],
});

export default {
  subscribe,
  scan(terrain: Terrain) {
    if (isRunning) {
      return;
    }
    isRunning = true;
    clearTimeout(timer);
    set({ isRunning: true, results: [], progress: 0 });
    Achievements.complete(Achievement.scanner);

    const results: ScannerResult[] = [];
    const aux = new Vector3();
    const anchor = terrain.getAnchor();
    const grid = [...Terrain.getRenderGrid(16)];
    const count = grid.length;
    const isMuted = !get(Settings).sfx;
    const scan = () => {
      const position = grid.shift();
      if (!position) {
        set({ isRunning: false, results, progress: 100 });
        isRunning = false;
        timer = setTimeout(() => set({ isRunning: false, results: [], progress: 0 }), 30000);
        return;
      }
      aux.addVectors(position, anchor).multiplyScalar(TerrainChunk.size);
      const deposit = terrain.getDeposit(aux);
      if (deposit) {
        results.unshift({ item: deposit.item, position: aux.clone() });
        !isMuted && sfx.paused && sfx.play();
      }
      set({ isRunning: true, results, progress: 1 - (grid.length / count)});
      setTimeout(scan, 5);
    };
    scan();
  },
};
