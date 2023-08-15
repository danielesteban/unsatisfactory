import { SvelteComponent } from 'svelte';
import { getFromObject } from '../core/brush';
import { Instance } from '../core/instances';
import { Buffer } from '../objects/buffers';
import { Belt } from '../objects/belts';
import { Fabricator } from '../objects/fabricators';
import { Generator } from '../objects/generators';
import { Item, Transformer as ItemTransformer } from '../objects/items';
import { Miner } from '../objects/miners';
import { Smelter } from '../objects/smelters';
import { Wire } from '../objects/wires';
import AchievementsUI from './achievements.svelte';
import BufferUI from './buffer.svelte';
import BuildUI from './build.svelte';
import CursorUI from './cursor.svelte';
import HotbarUI from './hotbar.svelte';
import GeneratorUI from './generator.svelte';
import MinerUI from './miner.svelte';
import TransformerUI from './transformer.svelte';

let current: SvelteComponent | undefined = undefined;
const target = document.getElementById('ui')!;
const viewport = document.getElementById('viewport')!;

export default (type: 'build' | 'container', instance?: Instance) => {
  document.exitPointerLock();
  if (current) {
    current.$destroy();
  }
  let dialog: SvelteComponent | undefined = undefined;
  const close = () => {
    if (current === dialog) {
      current = undefined;
    }
    dialog!.$destroy();
    viewport.requestPointerLock();
  };
  switch (type) {
    case 'build':
      dialog = new BuildUI({
        props: { close },
        target,
      });
      break;
    case 'container': {
      if (instance instanceof Buffer) {
        dialog = new BufferUI({
          props: { close, instance },
          target,
        });
      }
      if (instance instanceof Fabricator) {
        dialog = new TransformerUI({
          props: { close, instance, transformer: ItemTransformer.fabricator },
          target,
        });
      }
      if (instance instanceof Generator) {
        dialog = new GeneratorUI({
          props: { close, instance },
          target,
        });
      }
      if (instance instanceof Miner) {
        dialog = new MinerUI({
          props: { close, instance },
          target,
        });
      }
      if (instance instanceof Smelter) {
        dialog = new TransformerUI({
          props: { close, instance, transformer: ItemTransformer.smelter },
          target,
        });
      }
      break;
    }
  }
  current = dialog;
};

const cursor = new CursorUI({ target });

export const setTooltip = (
  action?: 'belt' | 'build' | 'configure' | 'dismantle' | 'invalid' | 'wire' | 'yield',
  instance?: Instance | Belt | Wire,
  from?: Instance,
  item?: Item,
  value?: number
) => {
  if (!action) {
    cursor.$set({ action: undefined });
    return;
  }
  cursor.$set({
    action,
    item,
    objectBrush: getFromObject(instance),
    fromBrush: getFromObject(from),
    value,
  });
};

new AchievementsUI({ target });
new HotbarUI({ target });
