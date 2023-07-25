import { SvelteComponent } from 'svelte';
import { Instance } from '../core/instances';
import { Buffer } from '../objects/buffers';
import { Belt } from '../objects/belts';
import { Generator } from '../objects/generators';
import { Fabricator } from '../objects/fabricators';
import { Foundation } from '../objects/foundations';
import { Miner } from '../objects/miners';
import { Pole } from '../objects/poles';
import { Wall } from '../objects/walls';
import { Wire } from '../objects/wires';
import BufferUI from './buffer.svelte';
import FabricatorUI from './fabricator.svelte';
import GeneratorUI from './generator.svelte';
import MinerUI from './miner.svelte';
import Cursor from './cursor.svelte';

let current: SvelteComponent | undefined = undefined;
const target = document.getElementById('ui')!;
const viewport = document.getElementById('viewport')!;

export default (instance: Instance) => {
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
  if (instance instanceof Buffer) {
    dialog = new BufferUI({
      props: { close, instance },
      target,
    });
  }
  if (instance instanceof Fabricator) {
    dialog = new FabricatorUI({
      props: { close, instance },
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
  current = dialog;
};

const getObject = (instance?: Instance | Belt | Wire) => {
  if (instance instanceof Belt) {
    return 'Belt';
  }
  if (instance instanceof Buffer) {
    return 'Buffer';
  }
  if (instance instanceof Fabricator) {
    return 'Fabricator';
  }
  if (instance instanceof Foundation) {
    return 'Foundation';
  }
  if (instance instanceof Generator) {
    return 'Generator';
  }
  if (instance instanceof Miner) {
    return 'Miner';
  }
  if (instance instanceof Pole) {
    return 'Pole';
  }
  if (instance instanceof Wall) {
    return 'Wall';
  }
  if (instance instanceof Wire) {
    return 'Wire';
  }
  return undefined;
};

const cursor = new Cursor({ target });
export const setTooltip = (action?: 'belt' | 'build' | 'configure' | 'dismantle' | 'wire', instance?: Instance | Belt | Wire, from?: Instance) => {
  if (!action) {
    cursor.$set({ action: undefined });
    return;
  }
  cursor.$set({ action, object: getObject(instance), from: getObject(from) });
};
