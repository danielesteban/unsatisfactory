import { Camera, Vector3 } from 'three';
import Container, { PoweredContainer } from './container';
import Belts, { Belt } from '../objects/belts';
import Buffers, { Buffer } from '../objects/buffers';
import Fabricators, { Fabricator } from '../objects/fabricators';
import Foundations from '../objects/foundations';
import Generators, { Generator }  from '../objects/generators';
import { Item, Recipes }  from '../objects/items';
import Miners, { Miner } from '../objects/miners';
import Poles, { Pole } from '../objects/poles';
import Ramps from '../objects/ramps';
import Sinks, { Sink } from '../objects/sinks';
import Smelters, { Smelter } from '../objects/smelters';
import Walls from '../objects/walls';
import Wires, { Wire } from '../objects/wires';

const version = 8;

type SerializedConnection = [number, number];
type SerializedDirection = [number, number, number];
type SerializedEnabled = 0 | 1;
type SerializedItems = ([Item, number] | number)[];
type SerializedPosition = [number, number, number];

type Serialized = {
  belts: [SerializedConnection, SerializedDirection, SerializedConnection, SerializedDirection, SerializedItems][];
  buffers: [SerializedPosition, number][];
  fabricators: [SerializedPosition, number, SerializedEnabled, number][];
  foundations: [SerializedPosition, number][];
  generators: [SerializedPosition, number, SerializedEnabled][];
  miners: [SerializedPosition, number, SerializedEnabled, Item, number][];
  poles: [SerializedPosition, number][];
  ramps: [SerializedPosition, number][];
  sinks: [SerializedPosition, number, SerializedEnabled, number][];
  smelters: [SerializedPosition, number, SerializedEnabled, number][];
  walls: [SerializedPosition, number][];
  wires: [SerializedConnection, SerializedConnection][];
  camera: [SerializedPosition, [number, number, number]];
  version: number;
};

const serializeItems = (items: Item[]) => items.reduce((items, item) => {
  let last = items[items.length - 1];
  const prevItem = Array.isArray(last) ? last[0] : last;
  if (prevItem === item) {
    if (!Array.isArray(last)) {
      items[items.length - 1] = last = [last, 1];
    }
    last[1]++;
  } else {
    items.push(item);
  }
  return items;
}, [] as SerializedItems);

const deserializeItems = (items: SerializedItems) => items.reduce((items, item) => {
  if (Array.isArray(item)) {
    for (let i = 0; i < item[1]; i++) {
      items.push(item[0]);
    }
  } else {
    items.push(item);
  }
  return items;
}, [] as Item[]);

export const serialize = (
  belts: Belts, buffers: Buffers, fabricators: Fabricators, foundations: Foundations, generators: Generators, miners: Miners, poles: Poles, ramps: Ramps, sinks: Sinks, smelters: Smelters, walls: Walls, wires: Wires,
  camera: Camera
): Serialized => {
  const containers = new WeakMap<Container, number>();
  const serializeInstances = (instances: Buffers | Fabricators | Foundations | Generators | Miners | Poles | Ramps | Sinks | Smelters | Walls) => (
    Array.from({ length: instances.count }, (_v, i) => {
      const instance = instances.getInstance(i);
      if (instance instanceof Container) {
        containers.set(instance, i);
      }
      return instance.serialize();
    })
  );
  const serializeContainer = (instance: Container) => {
    let key;
    if (instance instanceof Buffer) {
      key = 0;
    }
    if (instance instanceof Fabricator) {
      key = 1;
    }
    if (instance instanceof Generator) {
      key = 2;
    }
    if (instance instanceof Miner) {
      key = 3;
    }
    if (instance instanceof Pole) {
      key = 4;
    }
    if (instance instanceof Sink) {
      key = 5;
    }
    if (instance instanceof Smelter) {
      key = 6;
    }
    return [key, containers.get(instance)];
  };
  return {
    buffers: serializeInstances(buffers) as Serialized['buffers'],
    fabricators: serializeInstances(fabricators) as Serialized['fabricators'],
    foundations: serializeInstances(foundations) as Serialized['foundations'],
    generators: serializeInstances(generators) as Serialized['generators'],
    miners: serializeInstances(miners) as Serialized['miners'],
    poles: serializeInstances(poles) as Serialized['poles'],
    ramps: serializeInstances(ramps) as Serialized['ramps'],
    sinks: serializeInstances(sinks) as Serialized['sinks'],
    smelters: serializeInstances(smelters) as Serialized['smelters'],
    walls: serializeInstances(walls) as Serialized['walls'],
    belts: (belts.children as Belt[]).map((belt) => [
      serializeContainer(belt.from.container),
      belt.from.direction.toArray(),
      serializeContainer(belt.to.container),
      belt.to.direction.toArray(),
      serializeItems(belt.getItems()),
    ]) as Serialized['belts'],
    wires: (wires.children as Wire[]).map((wire) => [
      serializeContainer(wire.from),
      serializeContainer(wire.to),
    ]) as Serialized['wires'],
    camera: [camera.position.toArray(), camera.rotation.toArray().slice(0, 3)] as Serialized['camera'],
    version,
  };
};

export const deserialize = (
  serialized: Serialized,
  belts: Belts, buffers: Buffers, fabricators: Fabricators, foundations: Foundations, generators: Generators, miners: Miners, poles: Poles, ramps: Ramps, sinks: Sinks, smelters: Smelters, walls: Walls, wires: Wires,
  camera: Camera
) => {
  serialized = migrate(serialized);
  if (serialized.version !== version) {
    return false;
  }
  const aux = new Vector3();
  const auxB = new Vector3();
  const containers = [
    serialized.buffers.map(([position, rotation]) => (
      buffers.create(aux.fromArray(position), rotation)
    )),
    serialized.fabricators.map(([position, rotation, enabled, recipe]) => {
      const fabricator = fabricators.create(aux.fromArray(position), rotation, Recipes[recipe]);
      if (!enabled) {
        fabricator.setEnabled(false);
      }
      return fabricator;
    }),
    serialized.generators.map(([position, rotation, enabled]) => {
      const generator = generators.create(aux.fromArray(position), rotation)
      if (!enabled) {
        generator.setEnabled(false);
      }
      return generator;
    }),
    serialized.miners.map(([position, rotation, enabled, item, purity]) => {
      const miner = miners.create(aux.fromArray(position), rotation, item, purity);
      if (!enabled) {
        miner.setEnabled(false);
      }
      return miner;
    }),
    serialized.poles.map(([position, rotation]) => (
      poles.create(aux.fromArray(position), rotation)
    )),
    serialized.sinks.map(([position, rotation, enabled, points]) => {
      const sink = sinks.create(aux.fromArray(position), rotation)
      if (!enabled) {
        sink.setEnabled(false);
      }
      if (points > 0) {
        sink.setPoints(points);
      }
      return sink;
    }),
    serialized.smelters.map(([position, rotation, enabled, recipe]) => {
      const smelter = smelters.create(aux.fromArray(position), rotation, Recipes[recipe]);
      if (!enabled) {
        smelter.setEnabled(false);
      }
      return smelter;
    }),
  ];
  serialized.foundations.forEach(([position, rotation]) => (
    foundations.create(aux.fromArray(position), rotation)
  ));
  serialized.ramps.forEach(([position, rotation]) => (
    ramps.create(aux.fromArray(position), rotation)
  ));
  serialized.walls.forEach(([position, rotation]) => (
    walls.create(aux.fromArray(position), rotation)
  ));
  serialized.belts.forEach(([from, fromDirection, to, toDirection, items]) => {
    const belt = belts.create(
      { container: containers[from[0]][from[1]], direction: aux.fromArray(fromDirection) },
      { container: containers[to[0]][to[1]], direction: auxB.fromArray(toDirection) },
    );
    if (items.length) {
      belt.setItems(deserializeItems(items));
    }
  });
  serialized.wires.forEach(([from, to]) => (
    wires.create(
      containers[from[0]][from[1]] as PoweredContainer,
      containers[to[0]][to[1]] as PoweredContainer,
    )
  ));
  camera.position.fromArray(serialized.camera[0]);
  camera.userData.targetPosition.copy(camera.position);
  camera.rotation.fromArray(serialized.camera[1]);
  camera.userData.targetRotation.copy(camera.rotation);
  return true;
};

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
  }
  return serialized;
};

const migrations: Record<number, (serialized: Serialized) => Serialized> = {
  [2]: (serialized: Serialized) => {
    return {
      ...serialized,
      generators: serialized.generators.map(([position, rotation, enabled]) => ([
        [position[0], position[1] + 5, position[2]],
        rotation,
        enabled,
      ])),
      poles: serialized.poles.map(([position, rotation]) => ([
        [position[0], position[1] + 0.5, position[2]],
        rotation,
      ])),
      version: 3,
    };
  },
  [3]: (serialized: Serialized) => {
    return {
      ...serialized,
      miners: [],
      belts: serialized.belts.filter(([from, _fromDirection, to]) => from[0] !== 3 && to[0] !== 3),
      wires: serialized.wires.filter(([from, to]) => from[0] !== 3 && to[0] !== 3),
      version: 4,
    };
  },
  [4]: (serialized: Serialized) => {
    return {
      ...serialized,
      camera: [
        [
          serialized.camera[0][0],
          serialized.camera[0][1] + 0.15,
          serialized.camera[0][2],
        ],
        serialized.camera[1],
      ],
      version: 5,
    };
  },
  [5]: (serialized: Serialized) => {
    const remap = (connection: SerializedConnection) => {
      switch (connection[0]) {
        case 5:
          return [6, connection[1]] as SerializedConnection;
        default:
          return connection;
      }
    };
    return {
      ...serialized,
      sinks: [],
      belts: serialized.belts.map(([from, fromDirection, to, toDirection]) => [remap(from), fromDirection, remap(to), toDirection, []]),
      wires: serialized.wires.map(([from, to]) => [remap(from), remap(to)]),
      version: 6,
    };
  },
  [6]: (serialized: Serialized) => {
    return {
      ...serialized,
      belts: serialized.belts.map(([from, fromDirection, to, toDirection, items]) => [from, fromDirection, to, toDirection, items || []]),
      version: 7,
    };
  },
  [7]: (serialized: Serialized) => {
    return {
      ...serialized,
      ramps: [],
      version: 8,
    };
  },
};
