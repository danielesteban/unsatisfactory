import { writable } from 'svelte/store';
import Viewport from '../../core/viewport';

const { subscribe, set, update } = writable<{
  antialias: boolean;
  fov: number;
  gpu: string;
  lastSave: Date;
  renderRadius: number;
  resolution: number;
  sfx: boolean;
}>({
  antialias: true,
  fov: 75,
  gpu: 'Unknown',
  lastSave: new Date(),
  renderRadius: 9,
  resolution: 1,
  sfx: true,
});

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
      fov: viewport.getFOV(),
      gpu: gpu,
      lastSave: new Date(),
      renderRadius: viewport.getRenderRadius(),
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
  setFOV(fov: number) {
    viewport.setFOV(fov);
    update((settings) => ({
      ...settings,
      fov,
    }));
  },
  setRenderRadius(radius: number) {
    viewport.setRenderRadius(radius);
    update((settings) => ({
      ...settings,
      renderRadius: radius,
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
  takeScreenshot(width: number, height: number) {
    return viewport.capture(width, height);
  },
  toggleControlsMode() {
    viewport.controls.setMode((viewport.controls.getMode() + 1) % 2);
  },
  updateLastSave() {
    update((settings) => ({
      ...settings,
      lastSave: new Date(),
    }));
  },
};
