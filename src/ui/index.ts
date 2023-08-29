import { SvelteComponent } from 'svelte';
import { Camera } from 'three';
import { getFromObject } from '../core/brush';
import { Instance } from '../core/instances';
import { download, encode, load, serialize, Objects } from '../core/loader';
import Transformer from '../core/transformer';
import SFX from '../core/sfx';
import { Aggregator } from '../objects/aggregators';
import { Belt } from '../objects/belts';
import { Combinator } from '../objects/combinators';
import { Fabricator } from '../objects/fabricators';
import { Generator } from '../objects/generators';
import { Item, Transformer as ItemTransformer } from '../objects/items';
import { Miner } from '../objects/miners';
import { Sink } from '../objects/sinks';
import { Smelter } from '../objects/smelters';
import { Wire } from '../objects/wires';
import BuildUI from './dialogs/build.svelte';
import GeneratorUI from './dialogs/generator.svelte';
import MinerUI from './dialogs/miner.svelte';
import SinkUI from './dialogs/sink.svelte';
import SettingsUI from './dialogs/settings.svelte';
import TransformerUI from './dialogs/transformer.svelte';
import Achievements from './achievements.svelte';
import Alerts from './alerts.svelte';
import Compass from './compass.svelte';
import Cursor from './cursor.svelte';
import Hotbar from './hotbar.svelte';

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
      }
      break;
    }
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

const cursor = new Cursor({ target });
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

export const init = (
  camera: Camera,
  objects: Objects,
  sfx: SFX,
) => {
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
      download: () => (
        download(serialize(camera, objects))
      ),
      link: () => {
        const encoded = encode(JSON.stringify(serialize(camera, objects)));
        const url = new URL(location.href);
        url.hash = '/load/' + encoded;
        return url.href;
      },
      load: async () => {
        let serialized;
        try {
          serialized = await load();
        } catch (e) {
          return;
        }
        localStorage.setItem('autosave', JSON.stringify(serialized));
        location.reload();
      },
      reset: () => {
        localStorage.removeItem('autosave');
        location.reload();
      },
      save: () => {
        localStorage.setItem('autosave', JSON.stringify(serialize(camera, objects)));
      },
      sfx,
    },
    target: document.getElementById('ui')!,
  });
};
