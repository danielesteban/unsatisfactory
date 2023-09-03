import { writable } from 'svelte/store';
import Viewport from '../../core/viewport';

const { subscribe, set, update } = writable<{
  antialias: boolean;
  gpu: string;
  resolution: number;
  sfx: boolean;
}>({ antialias: true, gpu: 'Unknown', resolution: 1, sfx: true });

let viewport: Viewport;

export default {
  subscribe,
  setViewport(instance: Viewport) {
    if (viewport) {
      throw new Error();
    }
    viewport = instance;
    const context = viewport.renderer.getContext();
    const ext = context.getExtension('WEBGL_debug_renderer_info');
    const gpu = ext ? context.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'Unknown';
    set({
      antialias: viewport.getAntialias(),
      gpu: gpu,
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
