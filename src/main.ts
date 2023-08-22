import './main.css';
import { Base64 } from 'js-base64';
import {
  Object3D,
  Quaternion,
  Raycaster,
  Vector2,
  Vector3,
} from 'three';
import {
  Brush,
  brush,
  rotation,
  set as setBrush,
  pick,
  snap,
  getGeometry as getBrushGeometry,
} from './core/brush';
import { download, load, serialize, deserialize } from './core/loader';
import Container, { PoweredContainer, Connector } from './core/container';
import { Instance } from './core/instances';
import { Intersection } from './core/physics';
import Viewport from './core/viewport';
import Belts, { Belt } from './objects/belts';
import Birds from './objects/birds';
import Buffers, { Buffer } from './objects/buffers';
import Deposit from './objects/deposit';
import Fabricators, { Fabricator } from './objects/fabricators';
import Foundations from './objects/foundations';
import Generators, { Generator } from './objects/generators';
import Ghost from './objects/ghost';
import Grass from './objects/grass';
import Items from './objects/items';
import Miners, { Miner } from './objects/miners';
import Poles, { Pole } from './objects/poles';
import Ramps from './objects/ramps';
import Sinks, { Sink } from './objects/sinks';
import Smelters, { Smelter } from './objects/smelters';
import Terrain from './objects/terrain';
import Walls from './objects/walls';
import Wires, { Wire } from './objects/wires';
import UI, { setCompass, setTooltip } from './ui';
import Achievements from './ui/stores/achievements';
import Settings from './ui/settings.svelte';

const viewport = new Viewport();

[
  Belts.getMaterial(),
  Buffers.getMaterial(),
  Deposit.getMaterial(),
  Fabricators.getMaterial(),
  Foundations.getMaterial(),
  Generators.getMaterial(),
  ...Items.getMaterials(),
  Miners.getMaterial(),
  Poles.getMaterial(),
  Ramps.getMaterial(),
  Sinks.getMaterial(),
  Smelters.getMaterial(),
  Terrain.getMaterial(),
  Walls.getMaterial(),
  Wires.getMaterial(),
].forEach(viewport.setupMaterialCSM.bind(viewport));

[
  Birds.getMaterial(),
  Generators.getMaterial(),
  Generators.getDepthMaterial(),
  Ghost.getMaterial(),
  Grass.getMaterial(),
].forEach(viewport.setupMaterialTime.bind(viewport));

const terrain = new Terrain(viewport.physics);
viewport.scene.add(terrain);

const belts = new Belts(viewport.physics);
viewport.scene.add(belts);

const buffers = new Buffers(viewport.physics);
viewport.scene.add(buffers);

const fabricators = new Fabricators(viewport.physics, viewport.sfx);
viewport.scene.add(fabricators);

const foundations = new Foundations(viewport.physics);
viewport.scene.add(foundations);

const generators = new Generators(viewport.physics);
viewport.scene.add(generators);

const miners = new Miners(viewport.physics, viewport.sfx);
viewport.scene.add(miners);

const poles = new Poles(viewport.physics);
viewport.scene.add(poles);

const ramps = new Ramps(viewport.physics);
viewport.scene.add(ramps);

const sinks = new Sinks(viewport.physics);
viewport.scene.add(sinks);

const smelters = new Smelters(viewport.physics, viewport.sfx);
viewport.scene.add(smelters);

const walls = new Walls(viewport.physics);
viewport.scene.add(walls);

const wires = new Wires();
viewport.scene.add(wires);

const birds = new Birds(viewport.camera.position);
viewport.scene.add(birds);

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

const canBelt = (intersection: Intersection) => (
  (
    intersection.object instanceof Buffer
    || intersection.object instanceof Fabricator
    || intersection.object instanceof Miner
    || intersection.object instanceof Sink
    || intersection.object instanceof Smelter
  )
  && Math.abs(intersection.normal.dot(Object3D.DEFAULT_UP)) < 0.001
  && !(
    (
      intersection.object instanceof Fabricator
      || intersection.object instanceof Smelter
    )
    && Math.abs(intersection.normal.dot(worldNorth)) > 0.001
  )
  && (!from.container || from.container !== intersection.object)
);

const interactionLimit = 12 ** 2;
const canInteract = (intersection: Intersection) => {
  if (
    !(
      intersection.object instanceof Fabricator
      || intersection.object instanceof Generator
      || intersection.object instanceof Miner
      || intersection.object instanceof Sink
      || intersection.object instanceof Smelter
    )
  ) {
    return false;
  }
  return intersection.object.position.distanceToSquared(viewport.camera.position) <= interactionLimit;
};

const canWire = (intersection: Intersection) => {
  if (
    !(
      intersection.object instanceof Fabricator
      || intersection.object instanceof Generator
      || intersection.object instanceof Miner
      || intersection.object instanceof Pole
      || intersection.object instanceof Sink
      || intersection.object instanceof Smelter
    )
  ) {
    return false;
  }
  return intersection.object.canWire(from.container as PoweredContainer);
};

const worldNorth = new Vector3(0, 0, -1);
const create = (intersection: Intersection) => {
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
        from.container = intersection.object as Container;
        from.direction.copy(intersection.normal);
        return 'tap';
      }
      to.container = intersection.object as Container;
      to.direction.copy(intersection.normal);
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
      Achievements.complete('generator');
      return;
    case Brush.miner: {
      if (!(intersection.object instanceof Deposit)) {
        return 'nope';
      }
      const position = snap(intersection);
      // @dani @incomplete abstract this out of here and do the same check at hover
      for (let i = 0, l = miners.getCount(); i < l; i++) {
        if (miners.getInstance(i).position.equals(position)) {
          return 'nope';
        }
      }
      miners.create(position, rotation, intersection.object.getItem(), intersection.object.getPurity());
      Achievements.complete('miner');
      return;
    }
    case Brush.pole:
      poles.create(snap(intersection), rotation);
      return;
    case Brush.ramp:
      ramps.create(snap(intersection), rotation);
      return;
    case Brush.sink:
      sinks.create(snap(intersection), rotation);
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
        from.container = intersection.object as Container;
        return 'tap';
      }
      to.container = intersection.object as Container;
      wires.create(from.container as PoweredContainer, to.container as PoweredContainer);
      return 'wire';
  }
};

const remove = (intersection: Intersection) => {
  if (intersection.object instanceof Instance) {
    const instance = intersection.object;
    if (instance instanceof Container) {
      const { input, output } = instance.getBelts();
      [...input, ...output].forEach((belt) => belts.remove(belt));
    }
    if (instance instanceof PoweredContainer) {
      [...instance.getWires()].forEach((wire) => wires.remove(wire));
    }
    instance.parent.removeInstance(instance);
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

const handleInput = (
  { primary, secondary, tertiary, build, dismantle, interact }: { primary: boolean; secondary: boolean; tertiary: boolean; build: boolean; dismantle: boolean; interact: boolean; },
  intersection?: Intersection
) => {
  const hasFrom = from.container !== undefined;
  if (primary && intersection && brush !== Brush.none && brush !== Brush.dismantle) {
    const sound = create(intersection) || 'build';
    viewport.sfx.playAt(sound, intersection.point, 0, sound === 'nope' ? 0 : Math.random() * (sound === 'wire' ? 100 : 600));
  }
  if (primary && intersection?.object && brush === Brush.dismantle) {
    const sound = remove(intersection) || 'build';
    viewport.sfx.playAt(sound, intersection.point, 0, sound === 'nope' ? 0 : Math.random() * -600);
  }
  if (tertiary && intersection?.object) {
    pick(intersection);
  }
  if (build) {
    setBrush(Brush.none);
    UI('build');
    Achievements.complete('build');
  }
  if (dismantle) {
    setBrush(brush === Brush.dismantle ? Brush.none : Brush.dismantle);
  }
  if (interact || secondary) {
    setBrush(Brush.none);
    if (intersection?.object && canInteract(intersection)) {
      UI('container', intersection.object as Instance);
    }
  }
  if (hasFrom) {
    from.container = undefined;
  }
};

const aux = new Vector3();
const hover = (intersection?: Intersection) => {
  if (
    intersection
    && !(
      intersection.object instanceof Belt
      || intersection.object instanceof Wire
    )
    && ![Brush.none, Brush.belt, Brush.dismantle, Brush.wire].includes(brush)
  ) {
    const isValid = brush !== Brush.miner || intersection.object instanceof Deposit;
    ghost.update(getBrushGeometry(brush), snap(intersection), rotation, isValid);
    setTooltip(isValid ? 'build' : 'invalid');
    return;
  }
  ghost.visible = false;

  if (
    intersection?.object
    && brush === Brush.dismantle
    && (
      intersection.object instanceof Instance
      || intersection.object instanceof Belt
      || intersection.object instanceof Wire
    )
  ) {
    setTooltip('dismantle', intersection.object);
    return;
  }

  if (
    intersection?.object
    && (
      (brush === Brush.belt && canBelt(intersection))
      || (brush === Brush.wire && canWire(intersection))
    )
  ) {
    setTooltip(brush === Brush.belt ? 'belt' : 'wire', intersection.object as Instance, from.container);
    return;
  } else if (
    from.container
    && (brush === Brush.belt || brush === Brush.wire)
  ) {
    setTooltip(brush === Brush.belt ? 'belt' : 'wire', from.container);
    return;
  }

  if (
    brush === Brush.none
    && intersection?.object
    && canInteract(intersection)
  ) {
    setTooltip('configure', intersection.object as Instance);
    return;
  }

  if (
    brush === Brush.none
    && intersection?.object instanceof Deposit
    && intersection?.object.getWorldPosition(aux).distanceToSquared(viewport.camera.position) <= interactionLimit
  ) {
    setTooltip('yield', undefined, undefined, intersection?.object.getItem(), intersection?.object.getPurity());
    Achievements.complete('deposit');
    return;
  }

  setTooltip(undefined);
};

const terrainRadius = 8;
const center = new Vector2();
const intersection: Intersection = {
  distance: 0,
  normal: new Vector3(),
  point: new Vector3(),
};
const quaternion = new Quaternion();
const raycaster = new Raycaster();
raycaster.far = viewport.camera.far;
viewport.setAnimationLoop((buttons, delta) => {
  belts.step(delta);
  birds.step(delta);
  terrain.update(viewport.camera.position, terrainRadius);
  raycaster.setFromCamera(center, viewport.camera);
  // @dani @incomplete
  // wires don't have physics colliders implemented yet,
  // so.. keep using the threejs raycaster for those and merge them in.
  const vertexHit = (brush === Brush.dismantle || buttons.tertiary) && raycaster.intersectObjects(wires.children, false)[0];
  const physicsHit = viewport.physics.castRay(intersection, raycaster.ray.origin, raycaster.ray.direction, raycaster.far);
  let hit;
  if (physicsHit && (!vertexHit || intersection.distance < vertexHit.distance)) {
    hit = intersection;
    if (intersection.object && intersection.object instanceof Instance) {
      quaternion.setFromAxisAngle(Object3D.DEFAULT_UP, -intersection.object.rotation);
      intersection.normal.applyQuaternion(quaternion);
    }
  } else if (vertexHit) {
    intersection.distance = vertexHit.distance;
    intersection.normal.copy(vertexHit.face!.normal);
    intersection.object = vertexHit.object;
    intersection.point.copy(vertexHit.point);
    hit = intersection;
  }
  hover(hit);
  if (buttons.primary || buttons.secondary || buttons.tertiary || buttons.build || buttons.dismantle || buttons.interact) {
    handleInput(buttons, hit);
  }
  setCompass(viewport.camera.rotation.y, viewport.camera.position);
});

const data = [
  belts, buffers, fabricators, foundations, generators, miners, poles, ramps, sinks, smelters, walls, wires, viewport.camera,
] as [Belts, Buffers, Fabricators, Foundations, Generators, Miners, Poles, Ramps, Sinks, Smelters, Walls, Wires, typeof viewport.camera];

new Settings({
  props: {
    download: () => (
      download(serialize(...data))
    ),
    link: () => {
      const url = new URL(location.href);
      url.hash = '/load/' + Base64.encode(JSON.stringify(serialize(...data)), true);
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
      localStorage.clear();
      location.reload();
    },
    save: () => {
      localStorage.setItem(
        'autosave',
        JSON.stringify(serialize(...data))
      );
    },
    sfx: viewport.sfx,
  },
  target: document.getElementById('ui')!,
});

{
  let stored = localStorage.getItem('autosave');
  if (location.hash.slice(2, 6) === 'load') {
    try {
      stored = Base64.decode(location.hash.slice(7));
    } catch (e) {}
    location.hash = '/';
  }
  if (stored) {
    let serialized;
    try {
      serialized = JSON.parse(stored);
    } catch (e) {}
    if (serialized) {
      deserialize(serialized, ...data);
    }
  }
}
birds.reset();
terrain.update(viewport.camera.position, terrainRadius);
