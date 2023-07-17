import {
  Event,
  Intersection,
  Object3D,
  Vector3,
} from 'three';
import Containers from '../objects/containers';
import Foundations from '../objects/foundations';
import { TerrainChunk } from '../objects/terrain';
import Walls from '../objects/walls';

export enum Brush {
  foundation,
  container,
  belt,
  pipe,
  wall,
};

export let brush: Brush = Brush.foundation;

const dom = document.getElementById('brush')!;
const items = [
  'Foundation',
  'Container',
  'Belt',
  'Pipe',
  'Wall',
].map((name, i) => {
  const wrapper = document.createElement('div');
  const num = document.createElement('div');
  num.innerText = `${i + 1}`;
  wrapper.appendChild(num);
  const item = document.createElement('div');
  item.innerText = name;
  wrapper.appendChild(item);
  dom.appendChild(wrapper);
  return wrapper;
});
items[brush].classList.add('active');

document.addEventListener('keydown', (e) => {
  if (e.repeat) {
    return;
  }
  let current = brush;
  switch (e.code) {
    case 'Digit1':
      brush = Brush.foundation;
      break;
    case 'Digit2':
      brush = Brush.container;
      break;
    case 'Digit3':
      brush = Brush.belt;
      break;
    case 'Digit4':
      brush = Brush.pipe;
      break;
    case 'Digit5':
      brush = Brush.wall;
      break;
    default:
      return;
  }
  items[current].classList.remove('active');
  items[brush].classList.add('active');
});

const offsets = {
  container: new Vector3(1, 1, 1),
  foundation: new Vector3(2, 0.5, 2),
  wall: new Vector3(2, 2, 0.25),
};
const terrainOffsets = {
  container: new Vector3(0, 1, 0),
  foundation: new Vector3(0, 0.5, 0),
  wall: new Vector3(0, 2, 0),
};

export const snap = (brush: Brush, direction: Vector3, intersection: Intersection<Object3D<Event>>) => {
  if (intersection.object instanceof TerrainChunk) {
    let offset;
    switch (brush) {
      case Brush.container:
        offset = terrainOffsets.container;
        break;
      case Brush.foundation:
        offset = terrainOffsets.foundation
        break;
        case Brush.wall:
        offset = terrainOffsets.wall;
        break;
      default:
        throw new Error();
    }
    return intersection.point.clone().add(offset);
  }
  if (
    intersection.object instanceof Containers
    || intersection.object instanceof Foundations
    || intersection.object instanceof Walls
  ) {
    const instance = intersection.object.instances[intersection.instanceId!];
    let brushOffset;
    switch (brush) {
      case Brush.container:
        brushOffset = offsets.container;
        break;
      case Brush.foundation:
        brushOffset = offsets.foundation;
        break;
      case Brush.wall:
        brushOffset = offsets.wall;
        break;
      default:
        throw new Error();
    }
    let offset;
    if (intersection.object instanceof Containers) {
      offset = offsets.container;
    } else if (intersection.object instanceof Foundations) {
      offset = offsets.foundation;
    } else if (intersection.object instanceof Walls) {
      offset = offsets.wall;
    } else {
      throw new Error();
    }
    return instance.position.clone()
      .add(offset.clone().multiply(direction))
      .add(brushOffset.clone().multiply(direction));
  }
  throw new Error();
};
