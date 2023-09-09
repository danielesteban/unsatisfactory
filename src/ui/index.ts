import { SvelteComponent } from 'svelte';
import { Camera } from 'three';
import { getFromObject } from '../core/brush';
import { Item, Transformer as ItemTransformer } from '../core/data';
import { Instance } from '../core/instances';
import { download, encode, load, serialize, Objects } from '../core/loader';
import Transformer from '../core/transformer';
import Viewport from '../core/viewport';
import { Aggregator } from '../objects/aggregators';
import { Belt } from '../objects/belts';
import { Combinator } from '../objects/combinators';
import { Fabricator } from '../objects/fabricators';
import { Generator } from '../objects/generators';
import { Miner } from '../objects/miners';
import { Sink } from '../objects/sinks';
import { Smelter } from '../objects/smelters';
import { Storage } from '../objects/storages';
import { Wire } from '../objects/wires';
import BuildUI from './dialogs/build.svelte';
import CodexUI from './dialogs/codex.svelte';
import GeneratorUI from './dialogs/generator.svelte';
import InventoryUI from './dialogs/inventory.svelte';
import MinerUI from './dialogs/miner.svelte';
import SettingsUI from './dialogs/settings.svelte';
import SinkUI from './dialogs/sink.svelte';
import StorageUI from './dialogs/storage.svelte';
import TransformerUI from './dialogs/transformer.svelte';
import Achievements from './achievements.svelte';
import Alerts from './alerts.svelte';
import Compass from './compass.svelte';
import Cursor from './cursor.svelte';
import Hotbar from './hotbar.svelte';
import Loading from './loading.svelte';
import Cloudsaves from './stores/cloudsaves';
import Settings from './stores/settings';

let current: SvelteComponent | undefined = undefined;
const target = document.getElementById('ui')!;
const viewport = document.getElementById('viewport')!;

export default (type: 'build' | 'codex' | 'container' | 'inventory', instance?: Instance) => {
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
    case 'codex':
      dialog = new CodexUI({
        props: { close },
        target,
      });
      break;
    case 'container': {
      let transformer;
      if (instance instanceof Aggregator) {
        transformer = ItemTransformer.aggregator;
      } else if (instance instanceof Combinator) {
        transformer = ItemTransformer.combinator;
      } else if (instance instanceof Fabricator) {
        transformer = ItemTransformer.fabricator;
      } else if (instance instanceof Smelter) {
        transformer = ItemTransformer.smelter;
      }
      if (transformer !== undefined) {
        dialog = new TransformerUI({
          props: {
            close,
            instance: instance as Transformer,
            transformer,
          },
          target,
        });
        break;
      } else if (instance instanceof Generator) {
        dialog = new GeneratorUI({
          props: { close, instance },
          target,
        });
      } else if (instance instanceof Miner) {
        dialog = new MinerUI({
          props: { close, instance },
          target,
        });
      } else if (instance instanceof Sink) {
        dialog = new SinkUI({
          props: { close, instance },
          target,
        });
      } else if (instance instanceof Storage) {
        dialog = new StorageUI({
          props: { close, instance },
          target,
        });
      }
      break;
    }
    case 'inventory':
      dialog = new InventoryUI({
        props: { close },
        target,
      });
      break;
  }
  current = dialog;
};

const compass = new Compass({ target });
export const setCompass = (orientation: number, position: { x: number; z: number; }) => {
  orientation = Math.PI * 2 - (orientation - Math.floor(orientation/(Math.PI * 2)) * Math.PI * 2);
  compass.$set({
    lat: Math.floor(position.z),
    lon: Math.floor(position.x),
    orientation: Math.floor(orientation / Math.PI * 18000) / 100,
  });
};

export const setLoading = () => {
  const ui = new Loading({ target });
  return () => ui.$destroy();
};

const cursor = new Cursor({ target });
export const setTooltip = (
  action?: 'belt' | 'build' | 'configure' | 'dismantle' | 'invalid' | 'unaffordable' | 'wire' | 'yield',
  instance?: Instance | Belt | Wire,
  from?: Instance,
  cost?: { item: Exclude<Item, Item.none>; count: number; }[],
  item?: Item,
  value?: number
) => {
  if (!action) {
    cursor.$set({ action: undefined });
    return;
  }
  cursor.$set({
    action,
    cost,
    item,
    objectBrush: getFromObject(instance),
    fromBrush: getFromObject(from),
    value,
  });
};

export const init = (
  camera: Camera,
  objects: Objects,
  viewport: Viewport,
) => {
  Settings.setViewport(viewport);
  new Achievements({ target });
  new Alerts({ target });
  new Hotbar({ target });  
  new SettingsUI({
    props: {
      closeCurrentUI: () => {
        if (!current) {
          return;
        }
        current.$destroy();
        current = undefined;
      },
      load: async (file: File) => {
        let serialized;
        try {
          serialized = await load(file);
        } catch (e) {
          return;
        }
        serialized = JSON.stringify(serialized);
        if (Cloudsaves.isEnabled()) {
          await Cloudsaves.save(serialized);
        } else {
          localStorage.setItem('autosave', serialized);
        }
        location.reload();
      },
      download: () => (
        download(serialize(camera, objects))
      ),
      link: () => {
        const encoded = encode(JSON.stringify(serialize(camera, objects)));
        const url = new URL(location.href);
        url.hash = '/load/' + encoded;
        return url.href;
      },
      reset: async () => {
        if (Cloudsaves.isEnabled()) {
          await Cloudsaves.reset();
        } else {
          localStorage.removeItem('autosave');
        }
        location.reload();
      },
      save: async () => {
        const serialized = JSON.stringify(serialize(camera, objects));
        if (Cloudsaves.isEnabled()) {
          await Cloudsaves.save(serialized);
        } else {
          localStorage.setItem('autosave', serialized);
        }
      },
    },
    target: document.getElementById('ui')!,
  });
};
