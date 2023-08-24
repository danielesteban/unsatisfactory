import './main.css';
import {
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
} from './core/brush';
import Container, { PoweredContainer } from './core/container';
import { Buttons } from './core/controls';
import { Instance } from './core/instances';
import { decode, deserialize, Objects } from './core/loader';
import { Intersection } from './core/physics';
import Viewport from './core/viewport';
import Belts, { Belt, Connection } from './objects/belts';
import Birds from './objects/birds';
import Buffers, { Buffer } from './objects/buffers';
import Combinators from './objects/combinators';
import Deposit from './objects/deposit';
import Fabricators from './objects/fabricators';
import Foundations from './objects/foundations';
import Generators, { Generator } from './objects/generators';
import Ghost from './objects/ghost';
import Grass from './objects/grass';
import Items from './objects/items';
import Miners from './objects/miners';
import Pillars from './objects/pillars';
import Poles, { Pole } from './objects/poles';
import Ramps from './objects/ramps';
import Sinks from './objects/sinks';
import Smelters from './objects/smelters';
import Terrain from './objects/terrain';
import Walls from './objects/walls';
import Wires, { Wire } from './objects/wires';
import UI, { setCompass, setTooltip, init as initUI } from './ui';
import Achievements, { Achievement } from './ui/stores/achievements';

const terrainRadius = 8;
const interactionRadiusSquared = 12 ** 2;

const viewport = new Viewport();

[
  Belts.getMaterial(),
  Buffers.getMaterial(),
  Combinators.getMaterial(),
  Deposit.getMaterial(),
  Fabricators.getMaterial(),
  Foundations.getMaterial(),
  Generators.getMaterial(),
  ...Items.getMaterials(),
  Miners.getMaterial(),
  Pillars.getMaterial(),
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

const combinators = new Combinators(viewport.physics, viewport.sfx);
viewport.scene.add(combinators);

const fabricators = new Fabricators(viewport.physics, viewport.sfx);
viewport.scene.add(fabricators);

const foundations = new Foundations(viewport.physics);
viewport.scene.add(foundations);

const generators = new Generators(viewport.physics);
viewport.scene.add(generators);

const miners = new Miners(viewport.physics, viewport.sfx);
viewport.scene.add(miners);

const pillars = new Pillars(viewport.physics);
viewport.scene.add(pillars);

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

const objects: Objects = {
  belts, buffers, combinators, fabricators, foundations, generators, miners, pillars, poles, ramps, sinks, smelters, walls, wires,
};

const connection: { container: Container | PoweredContainer | undefined; connector: number; } = {
  container: undefined,
  connector: 0,
};

type IntersectionWithConnector = { connector: number | false; } & Intersection;

const canInteract = (intersection: Intersection) => (
  intersection?.object instanceof Container
  && !(intersection.object instanceof Buffer)
  && !(intersection.object instanceof Pole)
  && intersection.object.position.distanceToSquared(viewport.camera.position) <= interactionRadiusSquared
);

const canWire = (intersection: Intersection) => (
  intersection?.object instanceof PoweredContainer
  && intersection.object.canWire(connection.container as PoweredContainer)
);

const create = (intersection: IntersectionWithConnector) => {
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
      if (intersection.connector === false) {
        return 'nope';
      }
      if (!connection.container) {
        connection.container = intersection.object;
        connection.connector = intersection.connector;
        return 'tap';
      }
      belts.create(
        connection as Connection,
        { container: intersection.object, connector: intersection.connector }
      );
      return;
    case Brush.buffer:
      buffers.create(snap(intersection), rotation);
      return;
    case Brush.combinator:
      combinators.create(snap(intersection), rotation);
      return;
    case Brush.fabricator:
      fabricators.create(snap(intersection), rotation);
      return;
    case Brush.foundation:
      foundations.create(snap(intersection), rotation);
      return;
    case Brush.generator:
      generators.create(snap(intersection), rotation);
      Achievements.complete(Achievement.generator);
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
      Achievements.complete(Achievement.miner);
      return;
    }
    case Brush.pillar:
      pillars.create(snap(intersection), rotation);
      return;
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
      if (!connection.container) {
        connection.container = intersection.object as PoweredContainer;
        return 'tap';
      }
      wires.create(connection.container as PoweredContainer, intersection.object as PoweredContainer);
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
  { primary, secondary, tertiary, build, dismantle, interact }: Buttons,
  intersection?: IntersectionWithConnector
) => {
  const hasConnection = connection.container !== undefined;
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
    Achievements.complete(Achievement.build);
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
  if (hasConnection) {
    connection.container = undefined;
  }
};

const aux = new Vector3();
const hover = (intersection?: IntersectionWithConnector) => {
  ghost.visible = false;
  
  if (
    intersection?.object
    && (brush === Brush.belt && intersection.connector !== false)
  ) {
    if (connection.container) {
      ghost.setBelt(connection as Connection, { container: intersection.object as Container, connector: intersection.connector }, true);
    } else {
      ghost.setConnector((intersection.object as Container).getConnector(intersection.connector), true);
    }
    setTooltip('belt', intersection.object as Instance, connection.container);
    return;
  }

  if (
    brush === Brush.belt
    && connection.container
  ) {
    ghost.setConnector(connection.container.getConnector(connection.connector), true);
    setTooltip('belt', connection.container);
    return;
  }

  if (
    intersection
    && !(
      intersection.object instanceof Belt
      || intersection.object instanceof Wire
    )
    && ![Brush.none, Brush.belt, Brush.dismantle, Brush.wire].includes(brush)
  ) {
    const isValid = brush !== Brush.miner || intersection.object instanceof Deposit;
    ghost.setBrush(brush, snap(intersection), rotation, isValid);
    setTooltip(isValid ? 'build' : 'invalid');
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
    brush === Brush.none
    && intersection?.object instanceof Deposit
    && intersection?.object.getWorldPosition(aux).distanceToSquared(viewport.camera.position) <= interactionRadiusSquared
  ) {
    setTooltip('yield', undefined, undefined, intersection?.object.getItem(), intersection?.object.getPurity());
    Achievements.complete(Achievement.deposit);
    return;
  }

  if (
    intersection?.object
    && (brush === Brush.wire && canWire(intersection))
  ) {
    if (connection.container) {
      ghost.setWire(connection.container as PoweredContainer, intersection.object as PoweredContainer, true);
    }
    setTooltip('wire', intersection.object as Instance, connection.container);
    return;
  }

  if (
    brush === Brush.wire
    && connection.container
  ) {
    setTooltip('wire', connection.container);
    return;
  }

  setTooltip(undefined);
};

const getConnector = (intersection: Intersection) => {
  if (
    brush !== Brush.belt
    || !(intersection?.object instanceof Container)
    || intersection.object instanceof Generator
    || intersection.object instanceof Pole
  ) {
    return false;
  }
  const connector = intersection.object.intersectConnector(raycaster, intersection.distance);
  if (connector === false || !intersection.object.canBelt(connector, connection.container as Container)) {
    return false;
  }
  return connector;
};

const center = new Vector2();
const intersection: IntersectionWithConnector = {
  connector: false,
  distance: 0,
  normal: new Vector3(),
  point: new Vector3(),
};
const raycaster = new Raycaster();
raycaster.far = viewport.camera.far;
const animate = (buttons: Buttons, delta: number) => {
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
  } else if (vertexHit) {
    intersection.distance = vertexHit.distance;
    intersection.object = vertexHit.object;
    intersection.point.copy(vertexHit.point);
    hit = intersection;
  }
  intersection.connector = getConnector(intersection);
  hover(hit);
  if (buttons.primary || buttons.secondary || buttons.tertiary || buttons.build || buttons.dismantle || buttons.interact) {
    handleInput(buttons, hit);
  }
  setCompass(viewport.camera.rotation.y, viewport.camera.position);
};

{
  let stored;
  if (location.hash.slice(2, 6) === 'load') {
    stored = decode(location.hash.slice(7));
    location.hash = '/';
  }
  stored = stored || localStorage.getItem('autosave');
  if (stored) {
    let serialized;
    try {
      serialized = JSON.parse(stored);
    } catch (e) {}
    if (serialized) {
      deserialize(serialized, viewport.camera, objects);
    }
  }

  birds.reset();
  terrain.update(viewport.camera.position, terrainRadius);
  initUI(viewport.camera, objects, viewport.sfx);
  viewport.physics.init();
  viewport.setAnimationLoop(animate);
}
