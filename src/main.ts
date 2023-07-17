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
import Containers, { Container, Connector } from './objects/containers';
import Foundations from './objects/foundations';
import Pipes, { Pipe } from './objects/pipes';
import Terrain from './objects/terrain';
import Walls from './objects/walls';

const viewport = new Viewport();

[
  Belts.setupMaterial(),
  Containers.setupMaterial(),
  Foundations.setupMaterial(),
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
      containers.addInstance({ position: snap(brush, direction, intersection) });
      break;
    case Brush.foundation:
      foundations.addInstance({ position: snap(brush, direction, intersection) });
      break;
    case Brush.wall:
      walls.addInstance({ position: snap(brush, direction, intersection) });
      break;
    case Brush.belt:
    case Brush.pipe: {
      if (!(intersection.object instanceof Containers)) {
        return;
      }
      if (!from.container) {
        from.direction = direction;
        from.container = intersection.object.instances[intersection.instanceId!];
        return;
      }
      to.container = intersection.object.instances[intersection.instanceId!];
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

const remove = (intersection: Intersection<Object3D<Event>>) => {
  if (intersection.object instanceof Belt) {
    belts.remove(intersection.object);
    return;
  }
  if (intersection.object instanceof Containers) {
    const container = intersection.object.instances[intersection.instanceId!];
    containers.removeInstance(container);
    (belts.children as Pipe[])
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
    return;
  }
  if (intersection.object instanceof Foundations) {
    foundations.removeInstance(intersection.object.instances[intersection.instanceId!]);
    return;
  }
  if (intersection.object instanceof Pipe) {
    pipes.remove(intersection.object);
    return;
  }
  if (intersection.object instanceof Walls) {
    walls.removeInstance(intersection.object.instances[intersection.instanceId!]);
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
const handleInput = ({ primary, secondary, tertiary }: { primary: boolean; secondary: boolean; tertiary: boolean; }) => {
  const hasFrom = from.container !== undefined;
  raycaster.setFromCamera(center, viewport.camera);
  const intersection = raycaster.intersectObjects(viewport.scene.children)[0];
  if (primary && intersection && intersection.face) {
    create(intersection);
  }
  if (secondary && intersection && intersection.object) {
    remove(intersection);
  }
  if (tertiary && intersection && intersection.object) {
    pick(intersection);
  }
  if (hasFrom) {
    from.container = undefined;
  }
};

viewport.setAnimationLoop((buttons) => {
  terrain.update(viewport.camera.position, 8);
  if (buttons.primary || buttons.secondary || buttons.tertiary) {
    handleInput(buttons);
  }
});
