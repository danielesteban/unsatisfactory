import { get, writable } from 'svelte/store';
import { Vector3 } from 'three';
import { Item } from '../../core/data';
import { ChunkSize } from '../../objects/world/constants';
import Terrain from '../../objects/world/terrain';
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

let terrain: Terrain;

export default {
  subscribe,
  setTerrain(instance: Terrain) {
    terrain = instance;
  },
  map(width: number, depth: number, scale: number) {
    const aux = new Vector3();
    const offset = terrain.getAnchor().clone().multiplyScalar(ChunkSize * 2);
    offset.x += ChunkSize - width * 0.5 * scale;
    offset.z += ChunkSize - depth * 0.5 * scale;

    const altitude = new Float32Array(width * depth);
    for (let i = 0, z = 0; z < depth; z++) {
      for (let x = 0; x < width; x++, i++) {
        aux.set(offset.x + x * scale, 0, offset.z + z * scale);
        altitude[i] = terrain.getHeight(aux);
      }
    }
    return {
      altitude,
      offset,
    };
  },
  scan(radius: number = 12) {
    if (isRunning) {
      return;
    }
    isRunning = true;
    clearTimeout(timer);
    set({ isRunning: true, results: [], progress: 0 });
    Achievements.complete(Achievement.scanner);

    const results: ScannerResult[] = [];
    const aux = new Vector3();
    const chunk = new Vector3();
    const anchor = terrain.getAnchor();
    const center = new Vector3(ChunkSize * 0.5, 0, ChunkSize * 0.5);
    const grid = [...Terrain.getRenderGrid(radius).map(({ offset }) => offset)];
    const count = grid.length;
    const isMuted = !get(Settings).sfx;
    const scan = () => {
      const offset = grid.shift();
      if (!offset) {
        set({ isRunning: false, results, progress: 100 });
        isRunning = false;
        timer = setTimeout(() => set({ isRunning: false, results: [], progress: 0 }), 30000);
        return;
      }
      chunk.addVectors(anchor, offset).multiplyScalar(2);
      for (let z = 0; z < 2; z++) {
        for (let x = 0; x < 2; x++) {
          aux.set(chunk.x + x, 0, chunk.z + z).multiplyScalar(ChunkSize).add(center);
          const deposit = terrain.getDeposit(aux);
          if (deposit) {
            results.push({ item: deposit.item, position: aux.clone() });
            !isMuted && sfx.paused && sfx.play();
          }
        }
      }
      set({ isRunning: true, results, progress: 1 - (grid.length / count)});
      setTimeout(scan, 5);
    };
    scan();
  },
};
