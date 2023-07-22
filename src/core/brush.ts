import {
  Event,
  Intersection,
  Object3D,
  Quaternion,
  Vector3,
} from 'three';
import { Belt } from '../objects/belts';
import Buffers from '../objects/buffers';
import Fabricators from '../objects/fabricators';
import Foundations from '../objects/foundations';
import Generators from '../objects/generators';
import Miners from '../objects/miners';
import { TerrainChunk } from '../objects/terrain';
import Walls from '../objects/walls';
import { Wire } from '../objects/wires';
import UI from '../ui/brush.svelte';

export enum Brush {
  foundation,
  wall,
  belt,
  buffer,
  wire,
  fabricator,
  miner,
  generator,
};

export let brush: Brush = Brush.foundation;
export let rotation: number = 0;

const ui = new UI({
  props: {
    brush: brush as Brush,
    brushes: [
      { id: Brush.foundation, name: 'Foundation' },
      { id: Brush.wall, name: 'Wall' },
      { id: Brush.belt, name: 'Belt' },
      { id: Brush.buffer, name: 'Buffer' },
      { id: Brush.wire, name: 'Wire' },
      { id: Brush.fabricator, name: 'Fabricator' },
      { id: Brush.miner, name: 'Miner' },
      { id: Brush.generator, name: 'Generator' },
    ],
  },
  target: document.getElementById('ui')!,
});

const setBrush = (type: Brush) => {
  brush = type;
  ui.$set({ brush });
};

document.addEventListener('keydown', (e) => {
  if (e.repeat) {
    return;
  }
  switch (e.code) {
    case 'Digit1':
      setBrush(Brush.foundation);
      break;
    case 'Digit2':
      setBrush(Brush.wall);
      break;
    case 'Digit3':
      setBrush(Brush.belt);
      break;
    case 'Digit4':
      setBrush(Brush.buffer);
      break;
    case 'Digit5':
      setBrush(Brush.wire);
      break;
    case 'Digit6':
      setBrush(Brush.fabricator);
      break;
    case 'Digit7':
      setBrush(Brush.miner);
      break;
    case 'Digit8':
      setBrush(Brush.generator);
      break;
    case 'KeyQ': {
      rotation += Math.PI * 0.25;
      while (rotation > Math.PI) rotation -= Math.PI * 2;
      break;
    }
    case 'KeyE': {
      rotation -= Math.PI * 0.25;
      while (rotation < -Math.PI) rotation += Math.PI * 2;
      break;
    }
  }
});

export const pick = (intersection: Intersection<Object3D<Event>>) => {
  if (intersection.object instanceof Belt) {
    setBrush(Brush.belt);
    return;
  }
  if (intersection.object instanceof Buffers) {
    setBrush(Brush.buffer);
    rotation = intersection.object.getInstance(intersection.instanceId!).rotation;
    return;
  }
  if (intersection.object instanceof Fabricators) {
    setBrush(Brush.fabricator);
    rotation = intersection.object.getInstance(intersection.instanceId!).rotation;
    return;
  }
  if (intersection.object instanceof Foundations) {
    setBrush(Brush.foundation);
    rotation = intersection.object.getInstance(intersection.instanceId!).rotation;
    return;
  }
  if (intersection.object instanceof Generators) {
    setBrush(Brush.generator);
    rotation = intersection.object.getInstance(intersection.instanceId!).rotation;
    return;
  }
  if (intersection.object instanceof Miners) {
    setBrush(Brush.miner);
    rotation = intersection.object.getInstance(intersection.instanceId!).rotation;
    return;
  }
  if (intersection.object instanceof Walls) {
    setBrush(Brush.wall);
    rotation = intersection.object.getInstance(intersection.instanceId!).rotation;
    return;
  }
  if (intersection.object instanceof Wire) {
    setBrush(Brush.wire);
    return;
  }
};

const offsets = {
  buffer: new Vector3(1, 1, 1),
  fabricator: new Vector3(2, 2, 1),
  foundation: new Vector3(2, 0.5, 2),
  generator: new Vector3(2, 1, 2),
  miner: new Vector3(1, 2, 1),
  wall: new Vector3(2, 2, 0.25),
};
const terrainOffsets = {
  buffer: new Vector3(0, 1, 0),
  fabricator: new Vector3(0, 2, 0),
  foundation: new Vector3(0, 0.5, 0),
  generator: new Vector3(0, 1, 0),
  miner: new Vector3(0, 2, 0),
  wall: new Vector3(0, 2, 0),
};

const quaternion = new Quaternion();
const rotatedDirection = new Vector3();
const rotatedOffset = new Vector3();
const rotatedBrushOffset = new Vector3();
const worldUp = new Vector3(0, 1, 0);
export const snap = (intersection: Intersection<Object3D<Event>>) => {
  if (intersection.object instanceof TerrainChunk) {
    let offset;
    switch (brush) {
      case Brush.buffer:
        offset = terrainOffsets.buffer;
        break;
      case Brush.fabricator:
        offset = terrainOffsets.fabricator;
        break;
      case Brush.foundation:
        offset = terrainOffsets.foundation
        break;
      case Brush.generator:
        offset = terrainOffsets.generator
        break;
      case Brush.miner:
        offset = terrainOffsets.miner;
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
    intersection.object instanceof Buffers
    || intersection.object instanceof Fabricators
    || intersection.object instanceof Foundations
    || intersection.object instanceof Generators
    || intersection.object instanceof Miners
    || intersection.object instanceof Walls
  ) {
    const instance = intersection.object.getInstance(intersection.instanceId!);
    let brushOffset;
    switch (brush) {
      case Brush.buffer:
        brushOffset = offsets.buffer;
        break;
      case Brush.fabricator:
        brushOffset = offsets.fabricator;
        break;
      case Brush.foundation:
        brushOffset = offsets.foundation;
        break;
      case Brush.generator:
        brushOffset = offsets.generator;
        break;
      case Brush.miner:
        brushOffset = offsets.miner;
        break;
      case Brush.wall:
        brushOffset = offsets.wall;
        break;
      default:
        throw new Error();
    }
    let offset;
    if (intersection.object instanceof Buffers) {
      offset = offsets.buffer;
    } else if (intersection.object instanceof Fabricators) {
      offset = offsets.fabricator;
    } else if (intersection.object instanceof Foundations) {
      offset = offsets.foundation;
    } else if (intersection.object instanceof Generators) {
      offset = offsets.generator;
    } else if (intersection.object instanceof Miners) {
      offset = offsets.miner;
    } else if (intersection.object instanceof Walls) {
      offset = offsets.wall;
    } else {
      throw new Error();
    }

    const direction = intersection.face!.normal;
    quaternion.setFromAxisAngle(worldUp, instance.rotation);
    rotatedOffset.copy(offset).multiply(direction).applyQuaternion(quaternion);

    rotatedDirection.copy(direction).applyQuaternion(quaternion);
    quaternion.setFromAxisAngle(worldUp, -rotation);
    rotatedDirection.applyQuaternion(quaternion);
    quaternion.invert();
    rotatedBrushOffset.copy(brushOffset).multiply(rotatedDirection).applyQuaternion(quaternion);

    return instance.position.clone()
      .add(rotatedOffset)
      .add(rotatedBrushOffset);
  }
  throw new Error();
};
