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
import { Brush, brush, pick, rotation, set as setBrush, snap } from './core/brush';
import { download, load, serialize, deserialize } from './core/loader';
import Belts, { Belt } from './objects/belts';
import Buffers from './objects/buffers';
import Container, { PoweredContainer, Connector } from './core/container';
import Instances, { Instance } from './core/instances';
import Fabricators from './objects/fabricators';
import Foundations from './objects/foundations';
import Generators from './objects/generators';
import Ghost from './objects/ghost';
import Grass from './objects/grass';
import Items, { Item } from './objects/items';
import Miners from './objects/miners';
import Poles from './objects/poles';
import Smelters from './objects/smelters';
import Terrain from './objects/terrain';
import Walls from './objects/walls';
import Wires, { Wire } from './objects/wires';
import UI, { setTooltip } from './ui';
import Settings from './ui/settings.svelte';
import Debug from './debug';

const viewport = new Viewport();

[
  Belts.getMaterial(),
  Buffers.getMaterial(),
  Fabricators.getMaterial(),
  Foundations.getMaterial(),
  Generators.getMaterial(),
  ...Items.getMaterials(),
  Miners.getMaterial(),
  Poles.getMaterial(),
  Smelters.getMaterial(),
  Terrain.getMaterial(),
  Walls.getMaterial(),
  Wires.getMaterial(),
].forEach(viewport.setupMaterialCSM.bind(viewport));

[
  Ghost.getMaterial(),
  Generators.getMaterial(),
  Generators.getDepthMaterial(),
  Grass.getMaterial(),
].forEach(viewport.setupMaterialTime.bind(viewport));

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

const smelters = new Smelters(viewport.sfx);
viewport.scene.add(smelters);

const walls = new Walls();
viewport.scene.add(walls);

const wires = new Wires();
viewport.scene.add(wires);

const ghost = new Ghost();
viewport.scene.add(ghost);

const from: Omit<Connector, 'container'> & { container: Container | PoweredContainer | undefined; } = {
  container: undefined,
  direction: new Vector3(),
};
const to: Omit<Connector, 'container'> & { container: Container | PoweredContainer | undefined; } = {
  container: undefined,
  direction: new Vector3(),
};

const canBelt = (intersection: Intersection<Object3D<Event>>) => (
  (
    intersection.object instanceof Buffers
    || intersection.object instanceof Fabricators
    || intersection.object instanceof Miners
    || intersection.object instanceof Smelters
  )
  && Math.abs(intersection.face!.normal.dot(Object3D.DEFAULT_UP)) == 0
  && !(
    (intersection.object instanceof Fabricators || intersection.object instanceof Smelters)
    && Math.abs(intersection.face!.normal.dot(worldNorth)) > 0
  )
  && (!from.container || from.container !== intersection.object.getInstance(intersection.instanceId!))
);

const canWire = (intersection: Intersection<Object3D<Event>>) => {
  if (
    !(
      intersection.object instanceof Fabricators
      || intersection.object instanceof Generators
      || intersection.object instanceof Miners
      || intersection.object instanceof Poles
      || intersection.object instanceof Smelters
    )
  ) {
    return false;
  }
  const instance = intersection.object.getInstance(intersection.instanceId!);
  return instance.canWire(from.container as PoweredContainer);
};

const quaternion = new Quaternion();
const worldNorth = new Vector3(0, 0, -1);
const create = (intersection: Intersection<Object3D<Event>>) => {
  if (
    brush === Brush.none
    || brush === Brush.dismantle
    || intersection.object instanceof Belt
    || intersection.object instanceof Wire
  ) {
    return 'nope';
  }
  switch (brush) {
    case Brush.belt:
      if (!canBelt(intersection)) {
        return 'nope';
      }
      if (!from.container) {
        from.container = (intersection.object as Buffers | Fabricators | Miners | Smelters).getInstance(intersection.instanceId!);
        from.direction.copy(intersection.face!.normal);
        return 'tap';
      }
      to.container = (intersection.object as Buffers | Fabricators | Miners | Smelters).getInstance(intersection.instanceId!);
      to.direction.copy(intersection.face!.normal);
      quaternion.setFromAxisAngle(Object3D.DEFAULT_UP, from.container.rotation);
      from.direction.applyQuaternion(quaternion);
      quaternion.setFromAxisAngle(Object3D.DEFAULT_UP, to.container.rotation);
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
    case Brush.smelter:
      smelters.create(snap(intersection), rotation);
      return;
    case Brush.wall:
      walls.create(snap(intersection), rotation);
      return;
    case Brush.wire:
      if (!canWire(intersection)) {
        return 'nope';
      }
      if (!from.container) {
        from.container = (intersection.object as Fabricators | Generators | Miners | Poles | Smelters).getInstance(intersection.instanceId!);
        return 'tap';
      }
      to.container = (intersection.object as Fabricators | Generators | Miners | Poles | Smelters).getInstance(intersection.instanceId!);
      wires.create(from.container as PoweredContainer, to.container as PoweredContainer);
      return 'wire';
  }
};

const remove = (intersection: Intersection<Object3D<Event>>) => {
  if (intersection.object instanceof Instances) {
    const instance = intersection.object.getInstance(intersection.instanceId!);
    if (instance instanceof Container) {
      const { input, output } = instance.getBelts();
      [...input, ...output].forEach((belt) => belts.remove(belt));
    }
    if (instance instanceof PoweredContainer) {
      [...instance.getWires()].forEach((wire) => wires.remove(wire));
    }
    intersection.object.removeInstance(instance);
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
const interaction = (intersection: Intersection<Object3D<Event>>) => {
  if (
    intersection.object instanceof Buffers
    || intersection.object instanceof Fabricators
    || intersection.object instanceof Generators
    || intersection.object instanceof Miners
    || intersection.object instanceof Smelters
  ) {
    const instance = intersection.object.getInstance(intersection.instanceId!);
    if (instance.position.distanceTo(viewport.camera.position) <= interactionLimit) {
      UI('container', instance);
      return;
    }
  }
};

const handleInput = (
  { primary, secondary, tertiary, build, dismantle, interact }: { primary: boolean; secondary: boolean; tertiary: boolean; build: boolean; dismantle: boolean; interact: boolean; },
  intersection: Intersection<Object3D<Event>>
) => {
  const hasFrom = from.container !== undefined;
  if (primary && brush !== Brush.none && intersection?.object && intersection?.face) {
    if (brush === Brush.dismantle) {
      const sound = remove(intersection) || 'build';
      viewport.sfx.playAt(sound, intersection.point, 0, sound === 'nope' ? 0 : Math.random() * -600);
    } else {
      const sound = create(intersection) || 'build';
      viewport.sfx.playAt(sound, intersection.point, 0, sound === 'nope' ? 0 : Math.random() * (sound === 'wire' ? 100 : 600));
    }
  }
  if (tertiary && intersection?.object) {
    pick(intersection);
  }
  if (build) {
    setBrush(Brush.none);
    UI('build');
  }
  if (dismantle) {
    setBrush(brush === Brush.dismantle ? Brush.none : Brush.dismantle);
  }
  if (interact || secondary) {
    setBrush(Brush.none);
    if (intersection?.object) {
      interaction(intersection);
    }
  }
  if (hasFrom) {
    from.container = undefined;
  }
};

const hover = (intersection: Intersection<Object3D<Event>>) => {
  if (
    intersection?.object
    && !(
      intersection.object instanceof Belt
      || intersection.object instanceof Wire
    )
    && ![Brush.none, Brush.belt, Brush.dismantle, Brush.wire].includes(brush)
  ) {
    let geometry;
    switch (brush) {
      case Brush.buffer:
        geometry = Buffers.getGeometry();
        break;
      case Brush.fabricator:
        geometry = Fabricators.getGeometry();
        break;
      case Brush.foundation:
        geometry = Foundations.getGeometry();
        break;
      case Brush.generator:
        geometry = Generators.getGeometry();
        break;
      case Brush.miner:
        geometry = Miners.getGeometry();
        break;
      case Brush.pole:
        geometry = Poles.getGeometry();
        break;
      case Brush.smelter:
        geometry = Smelters.getGeometry();
        break;
      case Brush.wall:
        geometry = Walls.getGeometry();
        break;
    }
    ghost.update(geometry!, snap(intersection), rotation);
    setTooltip('build');
    return;
  }
  ghost.visible = false;

  if (
    intersection?.object
    && brush === Brush.dismantle
    && (
      intersection.object instanceof Instances
      || intersection.object instanceof Belt
      || intersection.object instanceof Wire
    )
  ) {
    let instance;
    if (
      intersection.object instanceof Belt
      || intersection.object instanceof Wire
    ) {
      instance = intersection.object;
    } else {
      instance = (intersection.object as Instances<Instance>).getInstance(intersection.instanceId!);
    }
    setTooltip('dismantle', instance);
    return;
  }

  if (
    intersection?.face
    && (
      (brush === Brush.belt && canBelt(intersection))
      || (brush === Brush.wire && canWire(intersection))
    )
  ) {
    const instance = (intersection.object as Instances<Instance>).getInstance(intersection.instanceId!);
    setTooltip(brush === Brush.belt ? 'belt' : 'wire', instance, from.container);
    return;
  }

  if (
    brush === Brush.none
    && (
      intersection?.object instanceof Buffers
      || intersection?.object instanceof Fabricators
      || intersection?.object instanceof Generators
      || intersection?.object instanceof Miners
      || intersection?.object instanceof Smelters
    )
  ) {
    const instance = intersection.object.getInstance(intersection.instanceId!);
    if (instance.position.distanceTo(viewport.camera.position) <= interactionLimit) {
      setTooltip('configure', instance);
      return;
    }
  }
  setTooltip(undefined);
};

const center = new Vector2();
const raycaster = new Raycaster();
viewport.setAnimationLoop((buttons, delta) => {
  belts.step(delta);
  terrain.update(viewport.camera.position, 8);
  raycaster.setFromCamera(center, viewport.camera);
  const intersection = raycaster.intersectObjects(viewport.scene.children)[0];
  hover(intersection);
  if (buttons.primary || buttons.secondary || buttons.tertiary || buttons.build || buttons.dismantle || buttons.interact) {
    handleInput(buttons, intersection);
  }
});

const restore = () => {
  const stored = localStorage.getItem('autosave');
  if (stored) {
    let serialized;
    try {
      serialized = JSON.parse(stored);
    } catch (e) {
      return false;
    }
    return deserialize(
      serialized,
      belts, buffers, fabricators, foundations, generators, miners, poles, smelters, walls, wires,
      viewport.camera
    );
  }
  return false;
};

const save = () => {
  localStorage.setItem(
    'autosave',
    JSON.stringify(serialize(belts, buffers, fabricators, foundations, generators, miners, poles, smelters, walls, wires, viewport.camera))
  );
  settings.$set({ lastSave: new Date() });
};

const settings = new Settings({
  props: {
    lastSave: new Date(),
    download: () => (
      download(serialize(belts, buffers, fabricators, foundations, generators, miners, poles, smelters, walls, wires, viewport.camera))
    ),
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
      localStorage.clear();
      location.reload();
    },
    save,
    sfx: viewport.sfx,
  },
  target: document.getElementById('ui')!,
});

if (!restore()) {
  Debug(
    belts, buffers, fabricators, foundations, generators, miners, poles, smelters, walls, wires,
    viewport.camera
  );
}

setInterval(save, 60000);
