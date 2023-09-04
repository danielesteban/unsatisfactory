import { Base64 } from 'js-base64';
import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';
import { Camera, Vector3 } from 'three';
import { Brush } from './brush';
import Container, { PoweredContainer } from './container';
import Aggregators, { Aggregator } from '../objects/aggregators';
import Belts, { Belt } from '../objects/belts';
import Buffers, { Buffer } from '../objects/buffers';
import Columns from '../objects/columns';
import Combinators, { Combinator } from '../objects/combinators';
import Fabricators, { Fabricator } from '../objects/fabricators';
import Foundations from '../objects/foundations';
import Generators, { Generator }  from '../objects/generators';
import { Item, Recipes, SerializedItems, serializeItems, deserializeItems }  from '../objects/items';
import Miners, { Miner } from '../objects/miners';
import Pillars from '../objects/pillars';
import Poles, { Pole } from '../objects/poles';
import Ramps from '../objects/ramps';
import Sinks, { Sink } from '../objects/sinks';
import Smelters, { Smelter } from '../objects/smelters';
import Storages, { Storage } from '../objects/storages';
import Walls from '../objects/walls';
import Wires, { Wire } from '../objects/wires';
import Achievements, { Achievement } from '../ui/stores/achievements';
import Hotbar from '../ui/stores/hotbar';
import Inventory from '../ui/stores/inventory';
import Points from '../ui/stores/points';

const version = 20;

export type Objects = {
  aggregators: Aggregators;
  belts: Belts;
  buffers: Buffers;
  columns: Columns;
  combinators: Combinators;
  fabricators: Fabricators;
  foundations: Foundations;
  generators: Generators;
  miners: Miners;
  pillars: Pillars;
  poles: Poles;
  ramps: Ramps;
  sinks: Sinks;
  smelters: Smelters;
  storages: Storages;
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
  belts: [SerializedContainer, number, SerializedContainer, number, SerializedItems | undefined][];
  buffers: [SerializedPosition, number, Item | undefined][];
  columns: [SerializedPosition, number][];
  combinators: SerializedTransformer[];
  fabricators: SerializedTransformer[];
  foundations: [SerializedPosition, number][];
  generators: [SerializedPosition, number, SerializedEnabled][];
  miners: [SerializedPosition, number, SerializedEnabled, Item, number, number, number | undefined][];
  pillars: [SerializedPosition, number][];
  poles: [SerializedPosition, number][];
  ramps: [SerializedPosition, number][];
  sinks: [SerializedPosition, number, SerializedEnabled][];
  smelters: SerializedTransformer[];
  storages: [SerializedPosition, number, [Item, number][] | undefined][];
  walls: [SerializedPosition, number][];
  wires: [SerializedContainer, SerializedContainer][];
  achievements: Achievement[];
  hotbar: Brush[];
  inventory: [Item, number][];
  points: number;
  view: [SerializedPosition, [number, number, number]];
  version: number;
};

export const serialize = (
  camera: Camera,
  {
    aggregators, belts, buffers, columns, combinators, fabricators, foundations, generators, miners, pillars, poles, ramps, sinks, smelters, storages, walls, wires,
  }: Objects
): Serialized => {
  const containers = new WeakMap<Container, number>();
  const serializeInstances = (instances: Aggregators | Buffers | Columns | Combinators | Fabricators | Foundations | Generators | Miners | Pillars | Poles | Ramps | Sinks | Smelters | Storages | Walls) => (
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
    if (instance instanceof Generator) {
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
    return [key, containers.get(instance)];
  };
  return {
    aggregators: serializeInstances(aggregators) as Serialized['aggregators'],
    buffers: serializeInstances(buffers) as Serialized['buffers'],
    columns: serializeInstances(columns) as Serialized['columns'],
    combinators: serializeInstances(combinators) as Serialized['combinators'],
    fabricators: serializeInstances(fabricators) as Serialized['fabricators'],
    foundations: serializeInstances(foundations) as Serialized['foundations'],
    generators: serializeInstances(generators) as Serialized['generators'],
    miners: serializeInstances(miners) as Serialized['miners'],
    pillars: serializeInstances(pillars) as Serialized['pillars'],
    poles: serializeInstances(poles) as Serialized['poles'],
    ramps: serializeInstances(ramps) as Serialized['ramps'],
    sinks: serializeInstances(sinks) as Serialized['sinks'],
    smelters: serializeInstances(smelters) as Serialized['smelters'],
    storages: serializeInstances(storages) as Serialized['storages'],
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
    view: [camera.position.toArray(), camera.rotation.toArray().slice(0, 3)] as Serialized['view'],
    version,
  };
};

export const deserialize = (
  serialized: Serialized,
  camera: Camera,
  {
    aggregators, belts, buffers, columns, combinators, fabricators, foundations, generators, miners, pillars, poles, ramps, sinks, smelters, storages, walls, wires,
  }: Objects
) => {
  serialized = migrate(serialized);
  if (serialized.version !== version) {
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
    serialized.generators.map(([position, rotation, enabled]) => {
      const generator = generators.create(aux.fromArray(position), rotation, false)
      if (!enabled) {
        generator.setEnabled(false);
      }
      return generator;
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
  ];
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
  camera.position.fromArray(serialized.view[0]);
  camera.userData.targetPosition.copy(camera.position);
  camera.rotation.fromArray(serialized.view[1]);
  camera.userData.targetRotation.copy(camera.rotation);
  return true;
};

export const decode = (encoded: string) => {
  let decoded;
  try {
    decoded = strFromU8(inflateSync(Base64.toUint8Array(encoded)));
  } catch (e) {}
  return decoded;
};

export const encode = (decoded: string) => (
  Base64.fromUint8Array(deflateSync(strToU8(decoded)), true)
);

export const load = () => new Promise<Serialized>((resolve, reject) => {
  const loader = document.createElement('input');
  loader.type = 'file';
  loader.accept = '.json';
  loader.addEventListener('change', ({ target: { files: [file] } }: any) => {
    if (!file) {
      return;
    }
    const url = URL.createObjectURL(file);
    fetch(url)
      .then((r) => r.json())
      .then((serialized: Serialized) => {
        serialized = migrate(serialized);
        if (serialized.version !== version) {
          throw new Error();
        }
        return serialized;
      })
      .then(resolve)
      .catch(reject)
      .finally(() => URL.revokeObjectURL(url));
  });
  loader.click();
});

export const download = (
  serialized: Serialized
) => {
  const downloader = document.createElement('a');
  const blob = new Blob([JSON.stringify(serialized)], { type: 'application/json' });
  downloader.href = URL.createObjectURL(blob);
  downloader.download = 'unsatisfactory.json';
  downloader.click();
};

const migrate = (
  serialized: Serialized
) => {
  let migration;
  while (migration = migrations[serialized.version]) {
    serialized = migration(serialized);
    serialized.version++;
  }
  return serialized;
};

const migrations: Record<number, (serialized: Serialized) => Serialized> = {
  [16]: (serialized: Serialized) => {
    const remap = (container: SerializedContainer): SerializedContainer => [container[0] + 1, container[1]];
    return {
      ...serialized,
      aggregators: [],
      belts: serialized.belts.map(([from, fromConnector, to, toConnector, items]) => [remap(from), fromConnector, remap(to), toConnector, items]),
      wires: serialized.wires.map(([from, to]) => [remap(from), remap(to)]),
    };
  },
  [17]: (serialized: Serialized) => {
    return {
      ...serialized,
      storages: [],
      inventory: [],
    };
  },
  [18]: (serialized: Serialized) => {
    return {
      ...serialized,
      aggregators: serialized.aggregators.map(([position, rotation, enabled, recipe, tick, buffers]) => ([
        position, rotation, enabled, recipe ? recipe + 1 : undefined, tick, buffers,
      ])),
    };
  },
  [19]: (serialized: Serialized) => {
    return {
      ...serialized,
      columns: [],
    };
  },
};
