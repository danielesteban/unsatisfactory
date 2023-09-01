import { writable } from 'svelte/store';
import Viewport from '../../core/viewport';

const { subscribe, set, update } = writable<{
  antialias: boolean;
  resolution: number;
  sfx: boolean;
}>({ antialias: true, resolution: 1, sfx: true });

let viewport: Viewport;

export default {
  subscribe,
  setViewport(instance: Viewport) {
    if (viewport) {
      throw new Error();
    }
    viewport = instance;
    set({
      antialias: viewport.getAntialias(),
      resolution: viewport.getResolution(),
      sfx: !viewport.sfx.getMuted(),
    });
  },
  setAntialias(enabled: boolean) {
    viewport.setAntialias(enabled);
    update((settings) => ({
      ...settings,
      antialias: enabled,
    }));
  },
  setResolution(scale: number) {
    viewport.setResolution(scale);
    update((settings) => ({
      ...settings,
      resolution: scale,
    }));
  },
  setSFX(enabled: boolean) {
    viewport.sfx.setMuted(!enabled);
    update((settings) => ({
      ...settings,
      sfx: enabled,
    }));
  },
};
