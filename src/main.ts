import './main.css';
import {
  Raycaster,
  Vector2,
  Vector3,
} from 'three';
import {
  brush,
  rotation,
  set as setBrush,
  getFromObject,
  pick,
  rotate as rotateBrush,
  snap,
  toggleSnapMode,
} from './core/brush';
import Container, { PoweredContainer } from './core/container';
import { Buttons } from './core/controls';
import { Brush } from './core/data';
import Instances, { Instance } from './core/instances';
import Loader from './core/loader';
import {
  BeltMaterial,
  CoalMaterial,
  ConcreteMaterial,
  ConnectorsMaterial,
  CopperMaterial,
  IronMaterial,
  RustMaterial,
  WireMaterial,
} from './core/materials';
import { Intersection as PhysicsIntersection } from './core/physics';
import Simulation from './core/simulation';
import Viewport from './core/viewport';
import Aggregators  from './objects/aggregators';
import Beacons  from './objects/beacons';
import Belts, { Belt, Connection } from './objects/belts';
import Buffers, { Buffer } from './objects/buffers';
import Columns from './objects/columns';
import Combinators from './objects/combinators';
import Fabricators from './objects/fabricators';
import Foundations from './objects/foundations';
import Foundries from './objects/foundries';
import Generators from './objects/generators';
import Ghost from './objects/ghost';
import Labs from './objects/labs';
import Miners from './objects/miners';
import Pillars from './objects/pillars';
import Poles, { Pole } from './objects/poles';
import Ramps from './objects/ramps';
import Sinks from './objects/sinks';
import Smelters from './objects/smelters';
import Storages from './objects/storages';
import Tesseracts from './objects/tesseracts';
import Turbines, { Turbine } from './objects/turbines';
import Walls from './objects/walls';
import Wires, { Wire } from './objects/wires';
import Birds from './objects/world/birds';
import Deposit from './objects/world/deposit';
import Grass from './objects/world/grass';
import Heightmap from './objects/world/heightmap';
import Terrain from './objects/world/terrain';
import UI, { Action, Dialog } from './ui';
import Achievements, { Achievement } from './ui/stores/achievements';
import Scanner from './ui/stores/scanner';

const interactionRadiusSquared = 12 ** 2;

const viewport = new Viewport();

// @dani @incomplete
// Figure out how to properly feed all this materials
// and their respective geometries into WebGLRenderer.compile()
// to avoid the current hitching when uncompiled shaders get into view.
[
  BeltMaterial,
  CoalMaterial,
  ConcreteMaterial,
  ConnectorsMaterial,
  CopperMaterial,
  IronMaterial,
  RustMaterial,
  WireMaterial,
  Heightmap.getMaterial(),
  Turbines.getRotorMaterial(),
].forEach(viewport.setupMaterialCSM.bind(viewport));

[
  Birds.getMaterial(),
  Turbines.getDepthMaterial(),
  Turbines.getRotorMaterial(),
  Ghost.getMaterial(),
  Grass.getMaterial(),
].forEach(viewport.setupMaterialTime.bind(viewport));

const terrain = new Terrain(viewport.physics);
viewport.scene.add(terrain);

const aggregators = new Aggregators(viewport.physics, viewport.sfx);
viewport.scene.add(aggregators);

const beacons = new Beacons(viewport.physics);
viewport.scene.add(beacons);

const belts = new Belts(viewport.physics);
viewport.scene.add(belts);

const buffers = new Buffers(viewport.physics);
viewport.scene.add(buffers);

const columns = new Columns(viewport.physics);
viewport.scene.add(columns);

const combinators = new Combinators(viewport.physics, viewport.sfx);
viewport.scene.add(combinators);

const fabricators = new Fabricators(viewport.physics, viewport.sfx);
viewport.scene.add(fabricators);

const foundations = new Foundations(viewport.physics);
viewport.scene.add(foundations);

const foundries = new Foundries(viewport.physics, viewport.sfx);
viewport.scene.add(foundries);

const generators = new Generators(viewport.physics, viewport.sfx);
viewport.scene.add(generators);

const labs = new Labs(viewport.physics);
viewport.scene.add(labs);

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

const storages = new Storages(viewport.physics);
viewport.scene.add(storages);

const tesseracts = new Tesseracts(viewport.physics);
viewport.scene.add(tesseracts);

const turbines = new Turbines(viewport.physics);
viewport.scene.add(turbines);

const walls = new Walls(viewport.physics);
viewport.scene.add(walls);

const wires = new Wires();
turbines.addEventListener('efficiency', wires.updatePower.bind(wires));
viewport.scene.add(wires);

const birds = new Birds(viewport.camera.position);
viewport.scene.add(birds);

const ghost = new Ghost();
viewport.scene.add(ghost);

const brushObjects = {
  [Brush.aggregator]: aggregators,
  [Brush.beacon]: beacons,
  [Brush.belt]: belts,
  [Brush.buffer]: buffers,
  [Brush.column]: columns,
  [Brush.combinator]: combinators,
  [Brush.fabricator]: fabricators,
  [Brush.foundation]: foundations,
  [Brush.foundry]: foundries,
  [Brush.generator]: generators,
  [Brush.lab]: labs,
  [Brush.miner]: miners,
  [Brush.pillar]: pillars,
  [Brush.pole]: poles,
  [Brush.ramp]: ramps,
  [Brush.sink]: sinks,
  [Brush.smelter]: smelters,
  [Brush.storage]: storages,
  [Brush.tesseract]: tesseracts,
  [Brush.turbine]: turbines,
  [Brush.wall]: walls,
  [Brush.wire]: wires,
};

const connection: { container: Container | PoweredContainer | undefined; connector: number; } = {
  container: undefined,
  connector: 0,
};

type Intersection = Omit<PhysicsIntersection, 'object'> & {
  connector: number | false;
  object?: Belt | Deposit | Instance | Wire
};

const intersection: Intersection = {
  connector: false,
  distance: 0,
  normal: new Vector3(),
  point: new Vector3(),
};

const loader = new Loader(
  {
    aggregators,
    beacons,
    belts,
    buffers,
    columns,
    combinators,
    fabricators,
    foundations,
    foundries,
    generators,
    labs,
    miners,
    pillars,
    poles,
    ramps,
    sinks,
    smelters,
    storages,
    tesseracts,
    turbines,
    walls,
    wires,
  },
  viewport
);

const ui = new UI(loader, terrain, viewport);

const canInteract = (intersection: Intersection) => (
  intersection.object instanceof Container
  && !(intersection.object instanceof Buffer)
  && !(intersection.object instanceof Pole)
  && intersection.object.position.distanceToSquared(viewport.camera.position) <= interactionRadiusSquared
);

const canWire = (intersection: Intersection) => (
  intersection.object instanceof PoweredContainer
  && intersection.object.canWire(connection.container as PoweredContainer | undefined)
);

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
    case Brush.aggregator:
    case Brush.beacon:
    case Brush.buffer:
    case Brush.column:
    case Brush.combinator:
    case Brush.fabricator:
    case Brush.foundation:
    case Brush.foundry:
    case Brush.generator:
    case Brush.lab:
    case Brush.pillar:
    case Brush.pole:
    case Brush.ramp:
    case Brush.sink:
    case Brush.smelter:
    case Brush.storage:
    case Brush.tesseract:
    case Brush.turbine:
    case Brush.wall: {
      const object = brushObjects[brush];
      if (!object.canAfford()) {
        return 'nope';
      }
      object.create(snap(intersection), rotation);
      if (brush === Brush.beacon) {
        Achievements.complete(Achievement.beacon);
      }
      if (brush === Brush.turbine) {
        Achievements.complete(Achievement.turbine);
      }
      return;
    }
    case Brush.miner: {
      if (
        !(intersection.object instanceof Deposit)
        || !miners.canAfford()
      ) {
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
    case Brush.belt:
      if (
        intersection.connector === false
        || !belts.canAfford()
      ) {
        return 'nope';
      }
      if (!connection.container) {
        connection.container = intersection.object as Container;
        connection.connector = intersection.connector;
        return 'tap';
      }
      belts.create(
        connection as Connection,
        { container: intersection.object as Container, connector: intersection.connector }
      );
      return 'tap';
    case Brush.wire:
      if (
        !canWire(intersection)
        || !wires.canAfford()
      ) {
        return 'nope';
      }
      if (!connection.container) {
        connection.container = intersection.object as PoweredContainer;
        return 'tap';
      }
      wires.create(
        connection.container as PoweredContainer,
        intersection.object as PoweredContainer
      );
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
    const parent = brushObjects[
      getFromObject(instance) as Exclude<Brush, Brush.none | Brush.dismantle>
    ] as Instances<Instance>;
    parent.removeInstance(instance);
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
  { primary, secondary, tertiary, build, codex, dismantle, interact, inventory, map, scan }: Buttons,
  intersection?: Intersection
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
    ui.show(Dialog.build);
    Achievements.complete(Achievement.build);
  }
  if (codex) {
    setBrush(Brush.none);
    ui.show(Dialog.codex);
  }
  if (dismantle) {
    setBrush(brush === Brush.dismantle ? Brush.none : Brush.dismantle);
  }
  if (interact || secondary) {
    setBrush(Brush.none);
    if (intersection?.object && canInteract(intersection)) {
      ui.show(Dialog.container, intersection.object as Instance);
    }
  }
  if (inventory) {
    setBrush(Brush.none);
    ui.show(Dialog.inventory);
    Achievements.complete(Achievement.inventory);
  }
  if (map) {
    setBrush(Brush.none);
    ui.show(Dialog.map);
  }
  if (scan) {
    Scanner.scan();
  }
  if (hasConnection) {
    connection.container = undefined;
  }
};

const aux = new Vector3();
const hover = (intersection?: Intersection) => {
  ghost.visible = false;

  if (
    brush === Brush.belt
  ) {
    const affordable = belts.canAfford();
    const cost = belts.getCost();
    let from = connection.container as PoweredContainer;
    let to;
    if (
      intersection?.object
      && intersection.connector !== false
    ) {
      if (connection.container) {
        to = intersection.object as PoweredContainer;
        ghost.setBelt(connection as Connection, { container: intersection.object as Container, connector: intersection.connector }, affordable);
      } else {
        from = intersection.object as PoweredContainer;
        ghost.setConnector((intersection.object as Container).getConnector(intersection.connector), affordable);
      }
    } else if (connection.container) {
      ghost.setConnector(connection.container.getConnector(connection.connector), affordable);
    }
    if (from) {
      // @dani @incomplete
      // This tooltip logic is fucking nuts!
      // Should prolly refactor this function to take an object.
      ui.setCursor(!affordable ? Action.unaffordable : Action.belt, to || from, to ? from : undefined, cost);
      return;
    }
  }

  if (
    brush !== Brush.none
    && brush !== Brush.belt
    && brush !== Brush.dismantle
    && brush !== Brush.wire
  ) {
    const object = brushObjects[brush];
    const affordable = object.canAfford();
    const cost = object.getCost();
    let valid = false;
    if (
      intersection
      && !(
        intersection.object instanceof Belt
        || intersection.object instanceof Wire
      )
    ) {
      valid = (brush !== Brush.miner || intersection.object instanceof Deposit);
      ghost.setBrush(brush, snap(intersection), rotation, affordable && valid);
    }
    let action: Action;
    if (!valid) {
      action = Action.invalid;
    } else if (!affordable) {
      action = Action.unaffordable;
    } else {
      action = Action.build;
    }
    ui.setCursor(action, undefined, undefined, cost);
    return;
  }

  if (
    brush === Brush.none
    && intersection?.object
    && canInteract(intersection)
  ) {
    ui.setCursor(Action.configure, intersection.object as Instance);
    return;
  }

  if (
    brush === Brush.dismantle
    && intersection?.object
    && (
      intersection.object instanceof Instance
      || intersection.object instanceof Belt
      || intersection.object instanceof Wire
    )
  ) {
    ui.setCursor(Action.dismantle, intersection.object);
    return;
  }

  if (
    brush === Brush.none
    && intersection?.object instanceof Deposit
    && intersection.object.getWorldPosition(aux).distanceToSquared(viewport.camera.position) <= interactionRadiusSquared
  ) {
    ui.setCursor(Action.yield, undefined, undefined, undefined, intersection.object.getItem(), intersection.object.getPurity());
    Achievements.complete(Achievement.deposit);
    return;
  }

  if (
    brush === Brush.wire
  ) {
    const affordable = wires.canAfford();
    const cost = wires.getCost();
    let from = connection.container as PoweredContainer;
    let to;
    if (
      intersection?.object
      && canWire(intersection)
    ) {
      if (connection.container) {
        to = intersection.object as PoweredContainer;
      } else {
        from = intersection.object as PoweredContainer;
      }
      if (from && to) {
        ghost.setWire(from, to, affordable);
      }
    }
    if (from) {
      // @dani @incomplete
      // This tooltip logic is fucking nuts!
      // Should prolly refactor this function to take an object.
      ui.setCursor(!affordable ? Action.unaffordable : Action.wire, to || from, to ? from : undefined, cost);
      return;
    }
  }

  ui.setCursor(undefined);
};

const getConnector = (intersection: Intersection, raycaster: Raycaster) => {
  if (
    brush !== Brush.belt
    || !(intersection.object instanceof Container)
    || intersection.object instanceof Pole
    || intersection.object instanceof Turbine
  ) {
    return false;
  }
  const connector = intersection.object.intersectConnector(raycaster, intersection.distance + 0.25);
  if (connector === false || !intersection.object.canBelt(connector, connection.container as Container)) {
    return false;
  }
  return connector;
};

const center = new Vector2();
const simulation = new Simulation(
  belts,
  [aggregators, buffers, combinators, fabricators, foundries, generators, labs, miners, sinks, smelters, storages, tesseracts]
);
const animate = (buttons: Buttons, delta: number) => {
  birds.step(delta);
  simulation.step(delta);
  terrain.update(viewport.camera.position, viewport.getRenderRadius());
  viewport.raycaster.setFromCamera(center, viewport.camera);
  const vertexHit = (brush === Brush.dismantle || buttons.tertiary) && viewport.raycaster.intersectObjects<Wire>(wires.children, false)[0];
  const physicsHit = viewport.physics.castRay(intersection, viewport.raycaster.ray.origin, viewport.raycaster.ray.direction, viewport.raycaster.far);
  let hit;
  if (physicsHit && (!vertexHit || intersection.distance < vertexHit.distance)) {
    hit = intersection;
  } else if (vertexHit) {
    intersection.distance = vertexHit.distance;
    intersection.object = vertexHit.object;
    intersection.point.copy(vertexHit.point);
    hit = intersection;
  }
  if (hit) {
    hit.connector = getConnector(hit, viewport.raycaster);
  }
  if (brush !== Brush.none && brush !== Brush.dismantle && (buttons.rotateCCW || buttons.rotateCW)) {
    rotateBrush(buttons.rotateCCW ? 1 : -1);
  }
  if (buttons.snap) {
    toggleSnapMode();
  }
  hover(hit);
  if (buttons.primary || buttons.secondary || buttons.tertiary || buttons.build || buttons.codex || buttons.dismantle || buttons.interact || buttons.inventory || buttons.map || buttons.scan) {
    handleInput(buttons, hit);
  }
  ui.setCompass(viewport.camera.rotation.y, viewport.camera.position);
};

(async () => {
  const done = UI.loading();
  try {
    await loader.load();
  } catch (e) {
    // @dani @incomplete
    // Display loading error
  } finally {
    done();
  }
  birds.init();
  terrain.update(viewport.camera.position, viewport.getRenderRadius());
  viewport.physics.init();
  viewport.setAnimationLoop(animate);
  ui.init();
})();
