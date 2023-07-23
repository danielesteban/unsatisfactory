import './main.css';
import {
  Event,
  Intersection,
  Object3D,
  Quaternion,
  Raycaster,
  Vector2,
  Vector3,
} from 'three';
import Viewport from './core/viewport';
import { Brush, brush, rotation, pick, snap } from './core/brush';
import { download, load, serialize, deserialize } from './core/loader';
import Belts, { Belt } from './objects/belts';
import Buffers from './objects/buffers';
import Container, { PoweredContainer, Connector } from './core/container';
import Fabricators from './objects/fabricators';
import Foundations from './objects/foundations';
import Generators from './objects/generators';
import Items, { Item } from './objects/items';
import Miners from './objects/miners';
import Poles from './objects/poles';
import Terrain from './objects/terrain';
import Walls from './objects/walls';
import Wires, { Wire } from './objects/wires';
import UI, { setTooltip } from './ui';
import Settings from './ui/settings.svelte';
import Debug from './debug';

const viewport = new Viewport();

[
  Belts.setupMaterial(),
  Buffers.setupMaterial(),
  Fabricators.setupMaterial(),
  Foundations.setupMaterial(),
  Generators.setupMaterial(),
  Items.setupMaterial(),
  Miners.setupMaterial(),
  Poles.setupMaterial(),
  Terrain.setupMaterial(),
  Walls.setupMaterial(),
  Wires.setupMaterial(),
].forEach(viewport.setupMaterialCSM.bind(viewport));

const terrain = new Terrain();
viewport.controls.setHeightmap(terrain);
viewport.scene.add(terrain);

const belts = new Belts();
viewport.scene.add(belts);

const buffers = new Buffers();
viewport.scene.add(buffers);

const fabricators = new Fabricators(viewport.sfx);
viewport.scene.add(fabricators);

const foundations = new Foundations();
viewport.scene.add(foundations);

const generators = new Generators();
viewport.scene.add(generators);

const miners = new Miners(viewport.sfx);
viewport.scene.add(miners);

const poles = new Poles();
viewport.scene.add(poles);

const walls = new Walls();
viewport.scene.add(walls);

const wires = new Wires();
viewport.scene.add(wires);

const from: Omit<Connector, 'container'> & { container: Container | PoweredContainer | undefined; } = {
  container: undefined,
  direction: new Vector3(),
};
const to: Omit<Connector, 'container'> & { container: Container | PoweredContainer | undefined; } = {
  container: undefined,
  direction: new Vector3(),
};

const quaternion = new Quaternion();
const worldUp = new Vector3(0, 1, 0);
const worldNorth = new Vector3(0, 0, -1);
const create = (intersection: Intersection<Object3D<Event>>) => {
  if (
    intersection.object instanceof Belt
    || intersection.object instanceof Wire
  ) {
    return 'nope';
  }
  const direction = intersection.face!.normal;
  switch (brush) {
    case Brush.belt:
      if (
        !(
          intersection.object instanceof Buffers
          || intersection.object instanceof Fabricators
          || intersection.object instanceof Generators
          || intersection.object instanceof Miners
        )
        || Math.abs(direction.dot(worldUp)) > 0
        || (
          intersection.object instanceof Fabricators
          && Math.abs(direction.dot(worldNorth)) > 0
        )
      ) {
        return 'nope';
      }
      if (!from.container) {
        from.container = intersection.object.getInstance(intersection.instanceId!);
        from.direction.copy(direction);
        return;
      }
      to.container = intersection.object.getInstance(intersection.instanceId!);
      to.direction.copy(direction);
      if (from.container === to.container && from.direction.equals(to.direction)) {
        return 'nope';
      }
      quaternion.setFromAxisAngle(worldUp, from.container.rotation);
      from.direction.applyQuaternion(quaternion);
      quaternion.setFromAxisAngle(worldUp, to.container.rotation);
      to.direction.applyQuaternion(quaternion);
      belts.create(from as Connector, to as Connector);
      return;
    case Brush.buffer:
      buffers.create(snap(intersection), rotation);
      return;
    case Brush.fabricator:
      fabricators.create(snap(intersection), rotation);
      return;
    case Brush.foundation:
      foundations.create(snap(intersection), rotation);
      return;
    case Brush.generator:
      generators.create(snap(intersection), rotation);
      return;
    case Brush.miner:
      miners.create(snap(intersection), rotation, Item.ore);
      return;
    case Brush.pole:
      poles.create(snap(intersection), rotation);
      return;
    case Brush.wall:
      walls.create(snap(intersection), rotation);
      return;
    case Brush.wire:
      if (
        !(
          intersection.object instanceof Fabricators
          || intersection.object instanceof Generators
          || intersection.object instanceof Miners
          || intersection.object instanceof Poles
        )
      ) {
        return 'nope';
      }
      if (!from.container) {
        from.container = intersection.object.getInstance(intersection.instanceId!);
        return;
      }
      to.container = intersection.object.getInstance(intersection.instanceId!);
      if (from.container === to.container) {
        return 'nope';
      }
      wires.create(from.container as PoweredContainer, to.container as PoweredContainer);
      return 'wire';
  }
};

const removeConnected = (container: Container) => {
  (belts.children as Belt[])
    .reduce((connected, belt) => {
      if (belt.from.container === container || belt.to.container === container) {
        connected.push(belt);
      }
      return connected;
    }, [] as Belt[])
    .forEach((belt) => belts.remove(belt));
  (wires.children as Wire[])
    .reduce((connected, wire) => {
      if (wire.from === container || wire.to === container) {
        connected.push(wire);
      }
      return connected;
    }, [] as Wire[])
    .forEach((wire) => wires.remove(wire));
};

const remove = (intersection: Intersection<Object3D<Event>>) => {
  if (
    intersection.object instanceof Foundations
    || intersection.object instanceof Walls
  ) {
    intersection.object.removeInstance(intersection.object.getInstance(intersection.instanceId!));
    return;
  }
  if (
    intersection.object instanceof Buffers
    || intersection.object instanceof Fabricators
    || intersection.object instanceof Generators
    || intersection.object instanceof Miners
    || intersection.object instanceof Poles
  ) {
    const container = intersection.object.getInstance(intersection.instanceId!);
    intersection.object.removeInstance(container as any);
    removeConnected(container);
    return;
  }
  if (intersection.object instanceof Belt) {
    belts.remove(intersection.object);
    return;
  }
  if (intersection.object instanceof Wire) {
    wires.remove(intersection.object);
    return;
  }
  return 'nope';
};

const interactionLimit = 12;
const hover = (intersection: Intersection<Object3D<Event>>) => {
  let tooltip;
  if (
    from.container === undefined
    && (
      intersection?.object instanceof Buffers
      || intersection?.object instanceof Fabricators
      || intersection?.object instanceof Generators
      || intersection?.object instanceof Miners
    )
  ) {
    const instance = intersection.object.getInstance(intersection.instanceId!);
    if (instance.position.distanceTo(viewport.camera.position) <= interactionLimit) {
      tooltip = instance;
    }
  }
  setTooltip(tooltip);
};
const interaction = (intersection: Intersection<Object3D<Event>>) => {
  if (
    intersection.object instanceof Buffers
    || intersection.object instanceof Fabricators
    || intersection.object instanceof Generators
    || intersection.object instanceof Miners
  ) {
    const instance = intersection.object.getInstance(intersection.instanceId!);
    if (instance.position.distanceTo(viewport.camera.position) <= interactionLimit) {
      UI(instance);
      return;
    }
  }
};

const handleInput = (
  { primary, secondary, tertiary, interact }: { primary: boolean; secondary: boolean; tertiary: boolean; interact: boolean; },
  intersection: Intersection<Object3D<Event>>
) => {
  const hasFrom = from.container !== undefined;
  if (primary && intersection?.face) {
    const sound = create(intersection) || 'build';
    viewport.sfx.playAt(sound, intersection.point, 0, sound === 'nope' ? 0 : Math.random() * (sound === 'wire' ? 100 : 600));
  }
  if (secondary && intersection?.object) {
    const sound = remove(intersection) || 'build';
    viewport.sfx.playAt(sound, intersection.point, 0, sound === 'nope' ? 0 : Math.random() * -600);
  }
  if (tertiary && intersection?.object) {
    pick(intersection);
  }
  if (interact && intersection?.object) {
    interaction(intersection);
  }
  if (hasFrom) {
    from.container = undefined;
  }
};

const center = new Vector2();
const raycaster = new Raycaster();
viewport.setAnimationLoop((buttons, delta) => {
  belts.step(delta);
  terrain.update(viewport.camera.position, 8);
  raycaster.setFromCamera(center, viewport.camera);
  const intersection = raycaster.intersectObjects(viewport.scene.children)[0];
  hover(intersection);
  if (buttons.primary || buttons.secondary || buttons.tertiary || buttons.interact) {
    handleInput(buttons, intersection);
  }
});

const save = () => {
  localStorage.setItem(
    'autosave',
    JSON.stringify(serialize(belts, buffers, fabricators, foundations, generators, miners, poles, walls, wires, viewport.camera))
  );
  settings.$set({ lastSave: new Date() });
};

const settings = new Settings({
  props: {
    lastSave: new Date(),
    download: () => (
      download(serialize(belts, buffers, fabricators, foundations, generators, miners, poles, walls, wires, viewport.camera))
    ),
    load: async () => {
      const serialized = await load();
      localStorage.setItem('autosave', JSON.stringify(serialized));
      location.reload();
    },
    reset: () => {
      localStorage.clear();
      location.reload();
    },
    save,
  },
  target: document.getElementById('ui')!,
});

let stored = localStorage.getItem('autosave');
if (stored) {
  stored = JSON.parse(stored)!;
  deserialize(
    stored as any,
    belts, buffers, fabricators, foundations, generators, miners, poles, walls, wires,
    viewport.camera,
  );
} else {
  Debug(belts, buffers, fabricators, foundations, generators, miners, poles, walls, wires);
}

setInterval(save, 60000);
