import { SvelteComponent } from 'svelte';
import { getFromObject } from '../core/brush';
import { Item, Transformer as ItemTransformer } from '../core/data';
import { Instance } from '../core/instances';
import Loader from '../core/loader';
import Transformer from '../core/transformer';
import Viewport from '../core/viewport';
import { Aggregator } from '../objects/aggregators';
import { Belt } from '../objects/belts';
import { Combinator } from '../objects/combinators';
import { Fabricator } from '../objects/fabricators';
import { Foundry } from '../objects/foundries';
import { Generator } from '../objects/generators';
import { Lab } from '../objects/labs';
import { Miner } from '../objects/miners';
import { Sink } from '../objects/sinks';
import { Smelter } from '../objects/smelters';
import { Storage } from '../objects/storages';
import { Tesseract } from '../objects/tesseracts';
import { Turbine } from '../objects/turbines';
import { Wire } from '../objects/wires';
import Loading from './components/loading.svelte';
import HUD from './hud/index.svelte';
import { Action } from './hud/cursor';
import BuildUI from './dialogs/build.svelte';
import CheatsUI from './dialogs/cheats.svelte';
import CodexUI from './dialogs/codex.svelte';
import GeneratorUI from './dialogs/generator.svelte';
import InventoryUI from './dialogs/inventory.svelte';
import LabUI from './dialogs/lab.svelte';
import MinerUI from './dialogs/miner.svelte';
import SettingsUI from './dialogs/settings.svelte';
import SinkUI from './dialogs/sink.svelte';
import StorageUI from './dialogs/storage.svelte';
import TesseractUI from './dialogs/tesseract.svelte';
import TransformerUI from './dialogs/transformer.svelte';
import TurbineUI from './dialogs/turbine.svelte';
import WelcomeUI from './dialogs/welcome.svelte';
import Settings from './stores/settings';

export { Action };
export enum Dialog {
  build,
  cheats,
  codex,
  container,
  inventory,
  settings,
  welcome,
};

class UI {
  private static readonly target: HTMLElement = document.getElementById('ui')!;
  private static readonly viewport: HTMLElement = document.getElementById('viewport')!;

  private readonly loader: Loader;
  private dialog?: SvelteComponent;
  private hud?: HUD;

  constructor(
    loader: Loader,
    viewport: Viewport
  ) {
    this.loader = loader;
    Settings.setViewport(viewport);
  }

  init() {
    const { target } = UI;
    if (this.hud) {
      throw new Error();
    }
    this.hud = new HUD({
      props: {
        loader: this.loader,
        settings: () => this.show(Dialog.settings),
      },
      target,
    });
    this.show(Dialog.welcome);

    // @dani Nothing to see here. Move along.
    const secret = {
      combo: [38, 38, 40, 40, 37, 39, 37, 39, 66, 65],
      sequence: 0,
    };
    document.addEventListener('keydown', ({ keyCode: code }: KeyboardEvent) => {
      if (code !== secret.combo[secret.sequence]) {
        secret.sequence = code === secret.combo[0] ? 1 : 0;
        return;
      }
      if (++secret.sequence === secret.combo.length) {
        secret.sequence = 0;
        this.show(Dialog.cheats);
      }
    });
  }

  setCompass(orientation: number, position: { x: number; z: number; }) {
    const { hud } = this;
    orientation = Math.PI * 2 - (orientation - Math.floor(orientation/(Math.PI * 2)) * Math.PI * 2);
    hud?.$set({
      compass: {
        lat: Math.floor(position.z * 100) / 100,
        lon: Math.floor(position.x * 100) / 100,
        orientation: Math.floor(orientation / Math.PI * 18000) / 100,
      },
    });
  }

  setCursor(
    action?: Action,
    instance?: Instance | Belt | Wire,
    from?: Instance,
    cost?: { item: Exclude<Item, Item.none>; count: number; }[],
    item?: Item,
    value?: number
  ) {
    const { hud } = this;
    hud?.$set({
      cursor: {
        action,
        cost,
        item,
        objectBrush: getFromObject(instance),
        fromBrush: getFromObject(from),
        value,
      },
    });
  }

  show(type: Dialog, instance?: Instance) {
    const { target } = UI;
    document.exitPointerLock();
    if (this.dialog) {
      this.dialog.$destroy();
    }
    let dialog: SvelteComponent | undefined = undefined;
    const close = () => {
      if (this.dialog === dialog) {
        this.dialog = undefined;
      }
      dialog!.$destroy();
      UI.viewport.requestPointerLock();
    };
    switch (type) {
      case Dialog.build:
        dialog = new BuildUI({
          props: { close },
          target,
        });
        break;
      case Dialog.cheats:
        dialog = new CheatsUI({
          props: { close },
          target,
        });
        break;
      case Dialog.codex:
        dialog = new CodexUI({
          props: { close },
          target,
        });
        break;
      case Dialog.container: {
        let transformer;
        if (instance instanceof Aggregator) {
          transformer = ItemTransformer.aggregator;
        } else if (instance instanceof Combinator) {
          transformer = ItemTransformer.combinator;
        } else if (instance instanceof Fabricator) {
          transformer = ItemTransformer.fabricator;
        } else if (instance instanceof Foundry) {
          transformer = ItemTransformer.foundry;
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
        } else if (instance instanceof Generator) {
          dialog = new GeneratorUI({
            props: { close, instance },
            target,
          });
        } else if (instance instanceof Lab) {
          dialog = new LabUI({
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
        } else if (instance instanceof Tesseract) {
          dialog = new TesseractUI({
            props: { close, instance },
            target,
          });
        } else if (instance instanceof Turbine) {
          dialog = new TurbineUI({
            props: { close, instance },
            target,
          });
        } 
        break;
      }
      case Dialog.inventory:
        dialog = new InventoryUI({
          props: { close },
          target,
        });
        break;
      case Dialog.settings:
        dialog = new SettingsUI({
          props: {
            close,
            loader: this.loader,
          },
          target,
        });
        break;
      case Dialog.welcome:
        dialog = new WelcomeUI({
          props: { close },
          target,
        });
        break;
    }
    this.dialog = dialog;
  }

  static loading() {
    const { target } = UI;
    let loading: Loading;
    const delay = setTimeout(() => {
      loading = new Loading({ target });
    }, 50);
    return () => {
      clearTimeout(delay);
      if (loading) {
        loading.$destroy();
      }
    };
  }
}

export default UI;
