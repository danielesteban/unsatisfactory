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
  renderRadius: 8,
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

    // @dani Nothing to see here. Move along.
    const secret = {
      combo: [38, 38, 40, 40, 37, 39, 37, 39, 66, 65],
      sequence: 0,
      mode: 0,
    };
    document.addEventListener('keydown', ({ keyCode: code }: KeyboardEvent) => {
      if (code !== secret.combo[secret.sequence]) {
        secret.sequence = code === secret.combo[0] ? 1 : 0;
        return;
      }
      if (++secret.sequence === secret.combo.length) {
        secret.sequence = 0;
        secret.mode = (secret.mode + 1) % 2;
        viewport.controls.setMode(secret.mode);
      }
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
  updateLastSave() {
    update((settings) => ({
      ...settings,
      lastSave: new Date(),
    }));
  },
};
