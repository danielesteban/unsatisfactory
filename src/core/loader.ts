import { Base64 } from 'js-base64';
import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';
import { Camera, Quaternion, Vector3 } from 'three';
import { Brush } from './brush';
import Container, { PoweredContainer } from './container';
import Belts, { Belt } from '../objects/belts';
import Buffers, { Buffer } from '../objects/buffers';
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
import Walls from '../objects/walls';
import Wires, { Wire } from '../objects/wires';
import Achievements, { Achievement } from '../ui/stores/achievements';
import Hotbar from '../ui/stores/hotbar';
import Points from '../ui/stores/points';

const version = 16;

export type Objects = {
  belts: Belts;
  buffers: Buffers;
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
  walls: Walls;
  wires: Wires;
};

type SerializedContainer = [number, number];
type SerializedEnabled = 0 | 1;
type SerializedPosition = [number, number, number];

type Serialized = {
  belts: [SerializedContainer, number, SerializedContainer, number, SerializedItems | undefined][];
  buffers: [SerializedPosition, number, Item | undefined][];
  combinators: [SerializedPosition, number, SerializedEnabled, number | undefined][];
  fabricators: [SerializedPosition, number, SerializedEnabled, number | undefined][];
  foundations: [SerializedPosition, number][];
  generators: [SerializedPosition, number, SerializedEnabled][];
  miners: [SerializedPosition, number, SerializedEnabled, Item, number][];
  pillars: [SerializedPosition, number][];
  poles: [SerializedPosition, number][];
  ramps: [SerializedPosition, number][];
  sinks: [SerializedPosition, number, SerializedEnabled][];
  smelters: [SerializedPosition, number, SerializedEnabled, number | undefined][];
  walls: [SerializedPosition, number][];
  wires: [SerializedContainer, SerializedContainer][];
  achievements: Achievement[];
  hotbar: Brush[];
  points: number;
  view: [SerializedPosition, [number, number, number]];
  version: number;
};

export const serialize = (
  camera: Camera,
  {
    belts, buffers, combinators, fabricators, foundations, generators, miners, pillars, poles, ramps, sinks, smelters, walls, wires,
  }: Objects
): Serialized => {
  const containers = new WeakMap<Container, number>();
  const serializeInstances = (instances: Buffers | Combinators | Fabricators | Foundations | Generators | Miners | Pillars | Poles | Ramps | Sinks | Smelters | Walls) => (
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
    if (instance instanceof Buffer) {
      key = 0;
    }
    if (instance instanceof Combinator) {
      key = 1;
    }
    if (instance instanceof Fabricator) {
      key = 2;
    }
    if (instance instanceof Generator) {
      key = 3;
    }
    if (instance instanceof Miner) {
      key = 4;
    }
    if (instance instanceof Pole) {
      key = 5;
    }
    if (instance instanceof Sink) {
      key = 6;
    }
    if (instance instanceof Smelter) {
      key = 7;
    }
    return [key, containers.get(instance)];
  };
  return {
    buffers: serializeInstances(buffers) as Serialized['buffers'],
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
    points: Points.serialize(),
    view: [camera.position.toArray(), camera.rotation.toArray().slice(0, 3)] as Serialized['view'],
    version,
  };
};

export const deserialize = (
  serialized: Serialized,
  camera: Camera,
  {
    belts, buffers, combinators, fabricators, foundations, generators, miners, pillars, poles, ramps, sinks, smelters, walls, wires,
  }: Objects
) => {
  serialized = migrate(serialized);
  if (serialized.version !== version) {
    return false;
  }
  const aux = new Vector3();
  const containers = [
    serialized.buffers.map(([position, rotation, item]) => {
      const buffer = buffers.create(aux.fromArray(position), rotation);
      if (item !== undefined) {
        buffer.setItem(item);
      }
      return buffer;
    }),
    serialized.combinators.map(([position, rotation, enabled, recipe]) => {
      const combinator = combinators.create(aux.fromArray(position), rotation);
      if (!enabled) {
        combinator.setEnabled(false);
      }
      if (recipe !== undefined && Recipes[recipe]) {
        combinator.setRecipe(Recipes[recipe]);
      }
      return combinator;
    }),
    serialized.fabricators.map(([position, rotation, enabled, recipe]) => {
      const fabricator = fabricators.create(aux.fromArray(position), rotation);
      if (!enabled) {
        fabricator.setEnabled(false);
      }
      if (recipe !== undefined && Recipes[recipe]) {
        fabricator.setRecipe(Recipes[recipe]);
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
    serialized.sinks.map(([position, rotation, enabled]) => {
      const sink = sinks.create(aux.fromArray(position), rotation)
      if (!enabled) {
        sink.setEnabled(false);
      }
      return sink;
    }),
    serialized.smelters.map(([position, rotation, enabled, recipe]) => {
      const smelter = smelters.create(aux.fromArray(position), rotation);
      if (!enabled) {
        smelter.setEnabled(false);
      }
      if (recipe !== undefined && Recipes[recipe]) {
        smelter.setRecipe(Recipes[recipe]);
      }
      return smelter;
    }),
  ];
  serialized.foundations.forEach(([position, rotation]) => (
    foundations.create(aux.fromArray(position), rotation)
  ));
  serialized.pillars.forEach(([position, rotation]) => (
    pillars.create(aux.fromArray(position), rotation)
  ));
  serialized.ramps.forEach(([position, rotation]) => (
    ramps.create(aux.fromArray(position), rotation)
  ));
  serialized.walls.forEach(([position, rotation]) => (
    walls.create(aux.fromArray(position), rotation)
  ));
  serialized.belts.forEach(([from, fromConnector, to, toConnector, items]) => {
    const belt = belts.create(
      { container: containers[from[0]][from[1]], connector: fromConnector },
      { container: containers[to[0]][to[1]], connector: toConnector },
    );
    if (items?.length) {
      belt.setItems(deserializeItems(items));
    }
  });
  serialized.wires.forEach(([from, to]) => (
    wires.create(
      containers[from[0]][from[1]] as PoweredContainer,
      containers[to[0]][to[1]] as PoweredContainer,
    )
  ));
  Achievements.deserialize(serialized.achievements);
  Hotbar.deserialize(serialized.hotbar);
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
    };
  },
  [3]: (serialized: Serialized) => {
    return {
      ...serialized,
      miners: [],
      belts: serialized.belts.filter(([from, _fromDirection, to]) => from[0] !== 3 && to[0] !== 3),
      wires: serialized.wires.filter(([from, to]) => from[0] !== 3 && to[0] !== 3),
    };
  },
  [4]: (serialized: Serialized) => {
    return {
      ...serialized,
      camera: [
        [
          (serialized as any).camera[0][0],
          (serialized as any).camera[0][1] + 0.15,
          (serialized as any).camera[0][2],
        ],
        (serialized as any).camera[1],
      ],
    };
  },
  [5]: (serialized: Serialized) => {
    const remap = (container: SerializedContainer) => {
      switch (container[0]) {
        case 5:
          return [6, container[1]] as SerializedContainer;
        default:
          return container;
      }
    };
    return {
      ...serialized,
      sinks: [],
      belts: serialized.belts.map(([from, fromDirection, to, toDirection]) => [remap(from), fromDirection, remap(to), toDirection, []]),
      wires: serialized.wires.map(([from, to]) => [remap(from), remap(to)]),
    };
  },
  [6]: (serialized: Serialized) => {
    return {
      ...serialized,
      belts: serialized.belts.map(([from, fromDirection, to, toDirection, items]) => [from, fromDirection, to, toDirection, items || []]),
    };
  },
  [7]: (serialized: Serialized) => {
    return {
      ...serialized,
      ramps: [],
    };
  },
  [8]: (serialized: Serialized) => {
    return {
      ...serialized,
      pillars: [],
    };
  },
  [9]: (serialized: Serialized) => {
    const stored = localStorage.getItem('achievements');
    let parsed: string[] | undefined;
    if (stored) {
      try {
        parsed = JSON.parse(stored) as string[];
      } catch (e) {
        parsed = undefined;
      }
    }
    const map: Record<string, Achievement> = {
      'deposit': Achievement.deposit,
      'build': Achievement.build,
      'miner': Achievement.miner,
      'generator': Achievement.generator,
      'power': Achievement.power,
      'smelter': Achievement.smelter,
      'fabricator': Achievement.fabricator,
      'points': Achievement.points,
    };
    return {
      ...serialized,
      achievements: (parsed || []).filter((id) => map[id]).map((id) => map[id]),
    };
  },
  [10]: (serialized: Serialized) => {
    const stored = localStorage.getItem('hotbar');
    let parsed: Brush[] | undefined;
    if (stored) {
      try {
        parsed = JSON.parse(stored) as Brush[];
      } catch (e) {
        parsed = undefined;
      }
    }
    const { camera, ...rest } = serialized as (Serialized & { camera: Serialized['view']; });
    return {
      ...rest,
      hotbar: (parsed || []),
      view: camera,
    };
  },
  [11]: (serialized: Serialized) => {
    const aux = new Vector3();
    const quaternion = new Quaternion();
    const worldUp = new Vector3(0, 1, 0);
    const containers = [
      serialized.buffers,
      serialized.fabricators,
      serialized.generators,
      serialized.miners,
      serialized.poles,
      serialized.sinks,
      serialized.smelters,
    ];
    const normals: { default: Vector3[] } & Partial<Record<number, Vector3[]>> = {
      default: [
        new Vector3(0, 0, 1),
        new Vector3(0, 0, -1),
        new Vector3(1, 0, 0),
        new Vector3(-1, 0, 0),
      ],
      [1]: [
        new Vector3(1, 0, 0),
        new Vector3(-1, 0, 0),
      ],
      [6]: [
        new Vector3(1, 0, 0),
        new Vector3(-1, 0, 0),
      ],
    };
    const remapContainer = (container: SerializedContainer): SerializedContainer => (
      [container[0] > 0 ? container[0] + 1 : container[0], container[1]]
    );
    const remapConnector = (container: SerializedContainer, direction: [number, number, number]) => {
      aux.fromArray(direction).applyQuaternion(quaternion.setFromAxisAngle(worldUp, -containers[container[0]][container[1]][1])).round();
      return (normals[container[0]] || normals.default).findIndex((n) => n.equals(aux));
    };
    return {
      ...serialized,
      combinators: [],
      achievements: serialized.achievements.map((achievement) => achievement === 8 ? 9 : achievement),
      wires: serialized.wires.map(([from, to]) => ([
        remapContainer(from),
        remapContainer(to),
      ])),
      belts: serialized.belts.map(([from, fromDirection, to, toDirection, items]) => ([
        remapContainer(from),
        remapConnector(from, fromDirection as any),
        remapContainer(to),
        remapConnector(to, toDirection as any),
        items,
      ])),
    };
  },
  [12]: (serialized: Serialized) => {
    const points = serialized.sinks.reduce<number>((points, sink) => {
      return points + ((sink as any)[3] || 0);
    }, 0);
    return {
      ...serialized,
      points,
    };
  },
  [13]: (serialized: Serialized) => {
    const remapRecipe = (transformer: [SerializedPosition, number, SerializedEnabled, number | undefined]) => ([
      ...transformer.slice(0, 3), (transformer[3] || 0) + 1,
    ] as [SerializedPosition, number, SerializedEnabled, number | undefined]);
    return {
      ...serialized,
      miners: [],
      combinators: serialized.combinators.map(remapRecipe),
      fabricators: serialized.fabricators.map(remapRecipe),
      smelters: serialized.smelters.map(remapRecipe),
      belts: serialized.belts.filter(([from, _fromConnector, to]) => from[0] !== 4 && to[0] !== 4),
      wires: serialized.wires.filter(([from, to]) => from[0] !== 4 && to[0] !== 4),
    };
  },
  [14]: (serialized: Serialized) => {
    return {
      ...serialized,
      buffers: serialized.buffers.map(([position, rotation, items]) => ([
        position, rotation, ((items as any) || [])[0]
      ])),
    };
  },
  [15]: (serialized: Serialized) => {
    const remapRecipe = (transformer: [SerializedPosition, number, SerializedEnabled, number | undefined]) => ([
      ...transformer.slice(0, 3), transformer[3] ? (transformer[3] + (transformer[3] >= 3 ? 1 : 0)) : undefined,
    ] as [SerializedPosition, number, SerializedEnabled, number | undefined]);
    return {
      ...serialized,
      combinators: serialized.combinators.map(remapRecipe),
      fabricators: serialized.fabricators.map(remapRecipe),
      smelters: serialized.smelters.map(remapRecipe),
    };
  },
};
