import './main.css';
import {
  Event,
  Intersection,
  Object3D,
  Raycaster,
  Vector2,
  Vector3,
} from 'three';
import Viewport from './core/viewport';
import { Brush, brush, setBrush, snap } from './core/brush';
import Belts, { Belt } from './objects/belts';
import Container, { Connector } from './objects/container';
import Containers from './objects/containers';
import Foundations from './objects/foundations';
import Items from './objects/items';
import Miners from './objects/miners';
import Pipes, { Pipe } from './objects/pipes';
import Terrain from './objects/terrain';
import Walls from './objects/walls';
import Info from './objects/info';

const viewport = new Viewport();

[
  Belts.setupMaterial(),
  Containers.setupMaterial(),
  Foundations.setupMaterial(),
  Items.setupMaterial(),
  Miners.setupMaterial(),
  Pipes.setupMaterial(),
  Terrain.setupMaterial(),
  Walls.setupMaterial(),
].forEach(viewport.setupMaterialCSM.bind(viewport));

const terrain = new Terrain();
viewport.controls.setHeightmap(terrain);
viewport.scene.add(terrain);

const belts = new Belts();
viewport.scene.add(belts);

const containers = new Containers();
viewport.scene.add(containers);

const foundations = new Foundations();
viewport.scene.add(foundations);

const miners = new Miners();
viewport.scene.add(miners);

const pipes = new Pipes();
viewport.scene.add(pipes);

const walls = new Walls();
viewport.scene.add(walls);

const from: Omit<Connector, "container"> & { container: Container | undefined; } = {
  container: undefined,
  direction: new Vector3(),
};
const to: Omit<Connector, "container"> & { container: Container | undefined; } = {
  container: undefined,
  direction: new Vector3(),
};

const worldUp = new Vector3(0, 1, 0);
const create = (intersection: Intersection<Object3D<Event>>) => {
  const direction = intersection.face!.normal;
  switch (brush) {
    case Brush.container:
      containers.create(snap(brush, direction, intersection));
      break;
    case Brush.foundation:
      foundations.addInstance({ position: snap(brush, direction, intersection) });
      break;
    case Brush.miner:
      miners.create(snap(brush, direction, intersection), 1 + Math.floor(Math.random() * 3));
      break;
    case Brush.wall:
      walls.addInstance({ position: snap(brush, direction, intersection) });
      break;
    case Brush.belt:
    case Brush.pipe: {
      if (
        !(intersection.object instanceof Containers)
        && !(intersection.object instanceof Miners)
      ) {
        return;
      }
      if (!from.container) {
        from.direction = direction;
        from.container = containers.getInstance(intersection.instanceId!);
        return;
      }
      to.container = containers.getInstance(intersection.instanceId!);
      to.direction = direction;
      if (from.container === to.container && from.direction.equals(to.direction)) {
        return;
      }
      if (brush === Brush.belt) {
        if (Math.abs(from.direction.dot(worldUp)) > 0 || Math.abs(to.direction.dot(worldUp)) > 0) {
          return;
        }
        belts.create(from as Connector, to as Connector);
      }
      if (brush === Brush.pipe) {
        pipes.create(from as Connector, to as Connector);
      }
      break;
    }
  }
};

const removeConnected = (container: Container) => {
  (belts.children as Belt[])
    .reduce((connected, belt) => {
      if (belt.from === container || belt.to === container) {
        connected.push(belt);
      }
      return connected;
    }, [] as Belt[])
    .forEach((belt) => belts.remove(belt));
  (pipes.children as Pipe[])
    .reduce((connected, pipe) => {
      if (pipe.from === container || pipe.to === container) {
        connected.push(pipe);
      }
      return connected;
    }, [] as Pipe[])
    .forEach((pipe) => pipes.remove(pipe));
};

const remove = (intersection: Intersection<Object3D<Event>>) => {
  if (intersection.object instanceof Belt) {
    belts.remove(intersection.object);
    return;
  }
  if (intersection.object instanceof Containers) {
    const container = containers.getInstance(intersection.instanceId!);
    containers.removeInstance(container);
    removeConnected(container);
    return;
  }
  if (intersection.object instanceof Foundations) {
    foundations.removeInstance(foundations.getInstance(intersection.instanceId!));
    return;
  }
  if (intersection.object instanceof Miners) {
    const miner = miners.getInstance(intersection.instanceId!);
    miners.removeInstance(miner);
    removeConnected(miner);
    return;
  }
  if (intersection.object instanceof Pipe) {
    pipes.remove(intersection.object);
    return;
  }
  if (intersection.object instanceof Walls) {
    walls.removeInstance(walls.getInstance(intersection.instanceId!));
    return;
  }
};

const pick = (intersection: Intersection<Object3D<Event>>) => {
  if (intersection.object instanceof Belt) {
    setBrush(Brush.belt);
    return;
  }
  if (intersection.object instanceof Containers) {
    setBrush(Brush.container);
    return;
  }
  if (intersection.object instanceof Foundations) {
    setBrush(Brush.foundation);
    return;
  }
  if (intersection.object instanceof Miners) {
    setBrush(Brush.miner);
    return;
  }
  if (intersection.object instanceof Pipe) {
    setBrush(Brush.pipe);
    return;
  }
  if (intersection.object instanceof Walls) {
    setBrush(Brush.wall);
    return;
  }
};

const center = new Vector2();
const raycaster = new Raycaster();
const handleInput = (
  { primary, secondary, tertiary }: { primary: boolean; secondary: boolean; tertiary: boolean; },
  intersection: Intersection<Object3D<Event>>
) => {
  const hasFrom = from.container !== undefined;
  if (primary && intersection?.face) {
    create(intersection);
  }
  if (secondary && intersection?.object) {
    remove(intersection);
  }
  if (tertiary && intersection?.object) {
    pick(intersection);
  }
  if (hasFrom) {
    from.container = undefined;
  }
};

const info = new Info() as (Info & Object3D);
viewport.scene.add(info);
const updateInfo = (intersection: Intersection<Object3D<Event>>) => {
  if (intersection?.object instanceof Containers) {
    const container: Container = containers.getInstance(intersection.instanceId!);
    info.position.copy(container.position);
    info.position.y += 1.5;
    info.setText(
      `${container.count()} items`
    );
    info.quaternion.copy(viewport.camera.quaternion);
  } else {
    info.visible = false;
  }
};

viewport.setAnimationLoop((buttons, delta) => {
  belts.step(delta);
  terrain.update(viewport.camera.position, 10);
  raycaster.setFromCamera(center, viewport.camera);
  const intersection = raycaster.intersectObjects(viewport.scene.children)[0];
  updateInfo(intersection);
  if (buttons.primary || buttons.secondary || buttons.tertiary) {
    handleInput(buttons, intersection);
  }
});
