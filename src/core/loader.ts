import { Base64 } from 'js-base64';
import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';
import { Vector3 } from 'three';
import Container, { PoweredContainer } from './container';
import { Brush, Item, Recipes, Researching } from './data';
import Instances, { Instance } from './instances';
import Viewport from './viewport';
import Aggregators, { Aggregator } from '../objects/aggregators';
import Beacons from '../objects/beacons';
import Belts, { Belt } from '../objects/belts';
import Buffers, { Buffer } from '../objects/buffers';
import Columns from '../objects/columns';
import Combinators, { Combinator } from '../objects/combinators';
import Fabricators, { Fabricator } from '../objects/fabricators';
import Foundations from '../objects/foundations';
import Foundries, { Foundry } from '../objects/foundries';
import Generators, { Generator }  from '../objects/generators';
import { SerializedItems, serializeItems, deserializeItems }  from '../objects/items';
import Labs, { Lab } from '../objects/labs';
import Miners, { Miner } from '../objects/miners';
import Pillars from '../objects/pillars';
import Poles, { Pole } from '../objects/poles';
import Ramps from '../objects/ramps';
import Sinks, { Sink } from '../objects/sinks';
import Smelters, { Smelter } from '../objects/smelters';
import Storages, { Storage } from '../objects/storages';
import Tesseracts, { Tesseract }  from '../objects/tesseracts';
import Turbines, { Turbine }  from '../objects/turbines';
import Walls from '../objects/walls';
import Wires, { Wire } from '../objects/wires';
import Achievements, { Achievement } from '../ui/stores/achievements';
import Cloudsaves from '../ui/stores/cloudsaves';
import Hotbar from '../ui/stores/hotbar';
import Inventory from '../ui/stores/inventory';
import Points from '../ui/stores/points';
import Research from '../ui/stores/research';
import Settings from '../ui/stores/settings';

type Objects = {
  aggregators: Aggregators;
  beacons: Beacons;
  belts: Belts;
  buffers: Buffers;
  columns: Columns;
  combinators: Combinators;
  fabricators: Fabricators;
  foundations: Foundations;
  foundries: Foundries;
  generators: Generators;
  labs: Labs;
  miners: Miners;
  pillars: Pillars;
  poles: Poles;
  ramps: Ramps;
  sinks: Sinks;
  smelters: Smelters;
  storages: Storages;
  tesseracts: Tesseracts;
  turbines: Turbines;
  walls: Walls;
  wires: Wires;
};

type SerializedBuffers = [number[], number];
type SerializedContainer = [number, number];
type SerializedEnabled = 0 | 1;
type SerializedPosition = [number, number, number];
type SerializedTransformer = [SerializedPosition, number, SerializedEnabled, number | undefined, number | undefined, SerializedBuffers | undefined];

type Serialized = {
  aggregators: SerializedTransformer[];
  beacons: [SerializedPosition, number][];
  belts: [SerializedContainer, number, SerializedContainer, number, SerializedItems | undefined][];
  buffers: [SerializedPosition, number, Item | undefined][];
  columns: [SerializedPosition, number][];
  combinators: SerializedTransformer[];
  fabricators: SerializedTransformer[];
  foundations: [SerializedPosition, number][];
  foundries: SerializedTransformer[];
  generators: [SerializedPosition, number, SerializedEnabled, number, number | undefined][];
  labs: [SerializedPosition, number, SerializedEnabled, number | undefined, number | undefined, number[] | undefined][];
  miners: [SerializedPosition, number, SerializedEnabled, Item, number, number, number | undefined][];
  pillars: [SerializedPosition, number][];
  poles: [SerializedPosition, number][];
  ramps: [SerializedPosition, number][];
  sinks: [SerializedPosition, number, SerializedEnabled][];
  smelters: SerializedTransformer[];
  storages: [SerializedPosition, number, [Item, number][] | undefined][];
  tesseracts: [SerializedPosition, number, SerializedEnabled, string | undefined, Item | undefined][];
  turbines: [SerializedPosition, number, SerializedEnabled][];
  walls: [SerializedPosition, number][];
  wires: [SerializedContainer, SerializedContainer][];
  achievements: Achievement[];
  hotbar: Brush[];
  inventory: [Item, number][];
  points: number;
  research: number[];
  view: [SerializedPosition, [number, number, number]];
  version: number;
};

class Loader {
  private readonly objects: Objects;
  private readonly viewport: Viewport;

  constructor(objects: Objects, viewport: Viewport) {
    this.objects = objects
    this.viewport = viewport;
  }

  async load() {
    let stored;
    if (location.hash.slice(2, 6) === 'load') {
      stored = Loader.decode(location.hash.slice(7));
      location.hash = '/';
    } else if (Cloudsaves.isEnabled()) {
      stored = await Cloudsaves.load();
    }
    stored = stored || localStorage.getItem('autosave');
    if (stored) {
      if (typeof stored === 'string') {
        try {
          stored = JSON.parse(stored);
        } catch (e) {}
      }
      this.deserialize(stored);
    }
  }

  async save() {
    const serialized = JSON.stringify(this.serialize());
    if (Cloudsaves.isEnabled()) {
      await Cloudsaves.save(serialized);
    } else {
      localStorage.setItem('autosave', serialized);
    }
    Settings.updateLastSave();
  }

  exportFile() {
    return new Blob([JSON.stringify(this.serialize())], { type: 'application/json' });
  }

  exportLink() {
    const encoded = Loader.encode(JSON.stringify(this.serialize()));
    const url = new URL(location.href);
    url.hash = '/load/' + encoded;
    return url.href;
  }

  exportSteganography() {
    const { viewport } = this;
    const encoded = deflateSync(strToU8(JSON.stringify(this.serialize())));
    const lengthAsBytes = new Uint8Array((new Uint32Array([encoded.length])).buffer);
    const bytes = new Uint8Array(lengthAsBytes.length + encoded.length);
    bytes.set(lengthAsBytes, 0);
    bytes.set(encoded, lengthAsBytes.length);
    const { length } = bytes;
    let byte = 0;
    let chunk = 0;
    const getChunk = () => {
      const v = (bytes[byte] >> (chunk * 2)) & 3;
      chunk++;
      if (chunk >= 4) {
        chunk = 0;
        byte++;
      }
      return v;
    };
    const size = Math.max(Math.ceil(Math.sqrt(length * 8 / 6)), 512);
    return viewport
      .capture(size, size, (pixel) => {
        for (let i = 0; i < 3 && byte < length; i++) {
          pixel[i] = (pixel[i] & ~3) | getChunk();
        }
      });
  }

  async importFile(file: File) {
    let serialized;
    try {
      serialized = await Loader.parse(file);
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
  }

  async reset() {
    if (Cloudsaves.isEnabled()) {
      await Cloudsaves.reset();
    } else {
      localStorage.removeItem('autosave');
    }
    location.reload();
  }

  private serialize(): Serialized {
    const {
      objects: {
        aggregators, beacons, belts, buffers, columns, combinators, fabricators, foundations, foundries, generators, labs, miners, pillars, poles, ramps, sinks, smelters, storages, tesseracts, turbines, walls, wires,
      },
      viewport: { camera },
    } = this;
    const containers = new WeakMap<Container, number>();
    const serializeInstances = (instances: Instances<Instance>) => (
      Array.from({ length: instances.getCount() }, (_v, i) => {
        const instance = instances.getInstance(i);
        if (instance instanceof Container) {
          containers.set(instance, i);
        }
        return instance.serialize();
      })
    );
    const serializeContainer = (instance: Container) => {
      let key;
      if (instance instanceof Aggregator) {
        key = 0;
      }
      if (instance instanceof Buffer) {
        key = 1;
      }
      if (instance instanceof Combinator) {
        key = 2;
      }
      if (instance instanceof Fabricator) {
        key = 3;
      }
      if (instance instanceof Turbine) {
        key = 4;
      }
      if (instance instanceof Miner) {
        key = 5;
      }
      if (instance instanceof Pole) {
        key = 6;
      }
      if (instance instanceof Sink) {
        key = 7;
      }
      if (instance instanceof Smelter) {
        key = 8;
      }
      if (instance instanceof Storage) {
        key = 9;
      }
      if (instance instanceof Generator) {
        key = 10;
      }
      if (instance instanceof Lab) {
        key = 11;
      }
      if (instance instanceof Foundry) {
        key = 12;
      }
      if (instance instanceof Tesseract) {
        key = 13;
      }
      return [key, containers.get(instance)];
    };
    return {
      aggregators: serializeInstances(aggregators) as Serialized['aggregators'],
      beacons: serializeInstances(beacons) as Serialized['beacons'],
      buffers: serializeInstances(buffers) as Serialized['buffers'],
      columns: serializeInstances(columns) as Serialized['columns'],
      combinators: serializeInstances(combinators) as Serialized['combinators'],
      fabricators: serializeInstances(fabricators) as Serialized['fabricators'],
      foundations: serializeInstances(foundations) as Serialized['foundations'],
      foundries: serializeInstances(foundries) as Serialized['foundries'],
      generators: serializeInstances(generators) as Serialized['generators'],
      labs: serializeInstances(labs) as Serialized['labs'],
      miners: serializeInstances(miners) as Serialized['miners'],
      pillars: serializeInstances(pillars) as Serialized['pillars'],
      poles: serializeInstances(poles) as Serialized['poles'],
      ramps: serializeInstances(ramps) as Serialized['ramps'],
      sinks: serializeInstances(sinks) as Serialized['sinks'],
      smelters: serializeInstances(smelters) as Serialized['smelters'],
      storages: serializeInstances(storages) as Serialized['storages'],
      tesseracts: serializeInstances(tesseracts) as Serialized['tesseracts'],
      turbines: serializeInstances(turbines) as Serialized['turbines'],
      walls: serializeInstances(walls) as Serialized['walls'],
      belts: (belts.children as Belt[]).map((belt) => {
        const items = serializeItems(belt.getItems());
        return [
          serializeContainer(belt.from.container),
          belt.from.connector,
          serializeContainer(belt.to.container),
          belt.to.connector,
          ...(items ? [items] : []),
        ];
      }) as Serialized['belts'],
      wires: (wires.children as Wire[]).map((wire) => [
        serializeContainer(wire.from),
        serializeContainer(wire.to),
      ]) as Serialized['wires'],
      achievements: Achievements.serialize(),
      hotbar: Hotbar.serialize(),
      inventory: Inventory.serialize(),
      points: Points.serialize(),
      research: Research.serialize(),
      view: [camera.position.toArray(), camera.rotation.toArray().slice(0, 3)] as Serialized['view'],
      version: Loader.version,
    };
  }

  private deserialize(serialized: Serialized) {
    const {
      objects: {
        aggregators, beacons, belts, buffers, columns, combinators, fabricators, foundations, foundries, generators, labs, miners, pillars, poles, ramps, sinks, smelters, storages, tesseracts, turbines, walls, wires,
      },
      viewport: { camera },
    } = this;
    serialized = Loader.migrate(serialized);
    if (serialized.version !== Loader.version) {
      return false;
    }
    const aux = new Vector3();
    const containers = [
      serialized.aggregators.map(([position, rotation, enabled, recipe, tick, buffers]) => {
        const aggregator = aggregators.create(aux.fromArray(position), rotation, false);
        if (!enabled) {
          aggregator.setEnabled(false);
        }
        if (recipe !== undefined && Recipes[recipe]) {
          aggregator.setRecipe(Recipes[recipe]);
          if (buffers) {
            aggregator.setBuffers(buffers);
          }
          if (tick) {
            aggregator.setTick(tick);
          }
        }
        return aggregator;
      }),
      serialized.buffers.map(([position, rotation, item]) => {
        const buffer = buffers.create(aux.fromArray(position), rotation, false);
        if (item !== undefined) {
          buffer.setItem(item);
        }
        return buffer;
      }),
      serialized.combinators.map(([position, rotation, enabled, recipe, tick, buffers]) => {
        const combinator = combinators.create(aux.fromArray(position), rotation, false);
        if (!enabled) {
          combinator.setEnabled(false);
        }
        if (recipe !== undefined && Recipes[recipe]) {
          combinator.setRecipe(Recipes[recipe]);
          if (buffers) {
            combinator.setBuffers(buffers);
          }
          if (tick) {
            combinator.setTick(tick);
          }
        }
        return combinator;
      }),
      serialized.fabricators.map(([position, rotation, enabled, recipe, tick, buffers]) => {
        const fabricator = fabricators.create(aux.fromArray(position), rotation, false);
        if (!enabled) {
          fabricator.setEnabled(false);
        }
        if (recipe !== undefined && Recipes[recipe]) {
          fabricator.setRecipe(Recipes[recipe]);
          if (buffers) {
            fabricator.setBuffers(buffers);
          }
          if (tick) {
            fabricator.setTick(tick);
          }
        }
        return fabricator;
      }),
      serialized.turbines.map(([position, rotation, enabled]) => {
        const turbine = turbines.create(aux.fromArray(position), rotation, false)
        if (!enabled) {
          turbine.setEnabled(false);
        }
        return turbine;
      }),
      serialized.miners.map(([position, rotation, enabled, item, purity, tick, buffer]) => {
        const miner = miners.create(aux.fromArray(position), rotation, item, purity, false);
        if (!enabled) {
          miner.setEnabled(false);
        }
        if (buffer) {
          miner.setBuffer(buffer);
        }
        if (tick) {
          miner.setTick(tick);
        }
        return miner;
      }),
      serialized.poles.map(([position, rotation]) => (
        poles.create(aux.fromArray(position), rotation, false)
      )),
      serialized.sinks.map(([position, rotation, enabled]) => {
        const sink = sinks.create(aux.fromArray(position), rotation, false)
        if (!enabled) {
          sink.setEnabled(false);
        }
        return sink;
      }),
      serialized.smelters.map(([position, rotation, enabled, recipe, tick, buffers]) => {
        const smelter = smelters.create(aux.fromArray(position), rotation, false);
        if (!enabled) {
          smelter.setEnabled(false);
        }
        if (recipe !== undefined && Recipes[recipe]) {
          smelter.setRecipe(Recipes[recipe]);
          if (buffers) {
            smelter.setBuffers(buffers);
          }
          if (tick) {
            smelter.setTick(tick);
          }
        }
        return smelter;
      }),
      serialized.storages.map(([position, rotation, inventory]) => {
        const storage = storages.create(aux.fromArray(position), rotation, false);
        if (inventory?.length) {
          storage.setInventory(inventory);
        }
        return storage;
      }),
      serialized.generators.map(([position, rotation, enabled, tick, buffer]) => {
        const generator = generators.create(aux.fromArray(position), rotation, false)
        if (!enabled) {
          generator.setEnabled(false);
        }
        if (buffer) {
          generator.setBuffer(buffer);
        }
        if (tick) {
          generator.setTick(tick);
        }
        return generator;
      }),
      serialized.labs.map(([position, rotation, enabled, research, tick, buffer]) => {
        const lab = labs.create(aux.fromArray(position), rotation, false)
        if (!enabled) {
          lab.setEnabled(false);
        }
        if (research !== undefined && Researching[research]) {
          lab.setResearch(Researching[research]);
          if (buffer) {
            lab.setBuffer(buffer);
          }
          if (tick) {
            lab.setTick(tick);
          }
        }
        return lab;
      }),
      serialized.foundries.map(([position, rotation, enabled, recipe, tick, buffers]) => {
        const foundry = foundries.create(aux.fromArray(position), rotation, false);
        if (!enabled) {
          foundry.setEnabled(false);
        }
        if (recipe !== undefined && Recipes[recipe]) {
          foundry.setRecipe(Recipes[recipe]);
          if (buffers) {
            foundry.setBuffers(buffers);
          }
          if (tick) {
            foundry.setTick(tick);
          }
        }
        return foundry;
      }),
      serialized.tesseracts.map(([position, rotation, enabled, id, buffer]) => {
        const tesseract = tesseracts.create(aux.fromArray(position), rotation, false);
        if (!enabled) {
          tesseract.setEnabled(false);
        }
        if (buffer !== undefined) {
          tesseract.setBuffer(buffer);
        }
        if (id !== undefined) {
          tesseract.setId(id);
        }
        return tesseract;
      }),
    ];
    serialized.beacons.forEach(([position, rotation]) => (
      beacons.create(aux.fromArray(position), rotation, false)
    ));
    serialized.columns.forEach(([position, rotation]) => (
      columns.create(aux.fromArray(position), rotation, false)
    ));
    serialized.foundations.forEach(([position, rotation]) => (
      foundations.create(aux.fromArray(position), rotation, false)
    ));
    serialized.pillars.forEach(([position, rotation]) => (
      pillars.create(aux.fromArray(position), rotation, false)
    ));
    serialized.ramps.forEach(([position, rotation]) => (
      ramps.create(aux.fromArray(position), rotation, false)
    ));
    serialized.walls.forEach(([position, rotation]) => (
      walls.create(aux.fromArray(position), rotation, false)
    ));
    serialized.belts.forEach(([from, fromConnector, to, toConnector, items]) => {
      const belt = belts.create(
        { container: containers[from[0]][from[1]], connector: fromConnector },
        { container: containers[to[0]][to[1]], connector: toConnector },
        false
      );
      if (items?.length) {
        belt.setItems(deserializeItems(items));
      }
    });
    serialized.wires.forEach(([from, to]) => (
      wires.create(
        containers[from[0]][from[1]] as PoweredContainer,
        containers[to[0]][to[1]] as PoweredContainer,
        false
      )
    ));
    Achievements.deserialize(serialized.achievements);
    Hotbar.deserialize(serialized.hotbar);
    Inventory.deserialize(serialized.inventory);
    Points.deserialize(serialized.points);
    Research.deserialize(serialized.research);
    camera.position.fromArray(serialized.view[0]);
    camera.userData.targetPosition.copy(camera.position);
    camera.rotation.fromArray(serialized.view[1]);
    camera.userData.targetRotation.copy(camera.rotation);
    return true;
  }

  private static encode(decoded: string) {
    return Base64.fromUint8Array(deflateSync(strToU8(decoded)), true);
  }

  private static decode(encoded: string) {
    let decoded;
    try {
      decoded = strFromU8(inflateSync(Base64.toUint8Array(encoded)));
    } catch (e) {}
    return decoded;
  }

  private static parse(file: File) {
    const url = URL.createObjectURL(file);
    return (
      file.type.indexOf('image') === 0 ? (
        new Promise((resolve, reject) => {
          const img = new Image();
          const canvas = document.createElement('canvas');
          img.onerror = reject;
          img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0);
            const pixels = ctx.getImageData(0, 0, img.width, img.height).data;
            let pixel = 0;
            const getByte = () => {
              let byte = 0;
              for (let i = 0; i < 4; i++) {
                byte |= (pixels[pixel++] & 3) << (i * 2);
                if (pixel % 4 == 3) pixel++;
              }
              return byte;
            };
            const length = (new Uint32Array((new Uint8Array([getByte(), getByte(), getByte(), getByte()])).buffer))[0];
            const encoded = new Uint8Array(length);
            for (let i = 0; i < length; i++) {
              encoded[i] = getByte();
            }
            let decoded;
            try {
              decoded = JSON.parse(strFromU8(inflateSync(encoded)));
            } catch (e) {
              reject(e);
              return;
            }
            resolve(decoded);
          };
          img.src = url;
        })
      ) : (
        fetch(url).then((r) => r.json())
      )
    )
      .then((serialized: Serialized) => {
        serialized = Loader.migrate(serialized);
        if (serialized.version !== Loader.version) {
          throw new Error();
        }
        return serialized;
      })
      .finally(() => URL.revokeObjectURL(url));
  }

  private static migrate = (
    serialized: Serialized
  ) => {
    let migration;
    while (migration = Loader.migrations[serialized.version]) {
      serialized = migration(serialized);
      serialized.version++;
    }
    return serialized;
  }

  private static readonly migrations: Record<number, (serialized: Serialized) => Serialized> = {
    // Sorry. New worldgen. Full wipe.
    // [25]: (serialized: Serialized) => {
    //   return {
    //     ...serialized,
    //   };
    // },
  };

  private static readonly version: number = 26;
}

export default Loader;
