import { SvelteComponent } from 'svelte';
import { Buffer } from '../objects/buffers';
import { Generator } from '../objects/generators';
import { Fabricator } from '../objects/fabricators';
import { Miner } from '../objects/miners';
import BufferUI from './buffer.svelte';
import FabricatorUI from './fabricator.svelte';
import GeneratorUI from './generator.svelte';
import MinerUI from './miner.svelte';
import Cursor from './cursor.svelte';

let current: SvelteComponent | undefined = undefined;
const target = document.getElementById('ui')!;
const viewport = document.getElementById('viewport')!;

export default (instance: Buffer | Fabricator | Generator | Miner) => {
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

const cursor = new Cursor({ target });
export const setTooltip = (tooltip?: { action: string; instance?: Buffer | Fabricator | Generator | Miner; }) => {
  if (!tooltip) {
    cursor.$set({ tooltip: undefined });
    return;
  }
  const { action } = tooltip;
  let object;
  if (tooltip.instance instanceof Buffer) {
    object = 'Buffer';
  }
  if (tooltip.instance instanceof Fabricator) {
    object = 'Fabricator';
  }
  if (tooltip.instance instanceof Generator) {
    object = 'Generator';
  }
  if (tooltip.instance instanceof Miner) {
    object = 'Miner';
  }
  cursor.$set({ tooltip: { action, object } });
};
