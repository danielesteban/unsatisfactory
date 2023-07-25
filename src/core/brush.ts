import {
  Event,
  Intersection,
  Object3D,
  Quaternion,
  Vector3,
} from 'three';
import Instances from '../core/instances';
import { Belt } from '../objects/belts';
import Buffers from '../objects/buffers';
import Fabricators from '../objects/fabricators';
import Foundations from '../objects/foundations';
import Generators from '../objects/generators';
import Miners from '../objects/miners';
import Poles from '../objects/poles';
import { TerrainChunk } from '../objects/terrain';
import Walls from '../objects/walls';
import { Wire } from '../objects/wires';
import UI from '../ui/brush.svelte';

export enum Brush {
  none,
  belt,
  buffer,
  fabricator,
  foundation,
  generator,
  miner,
  pole,
  wall,
  wire,
};

export let brush: Brush = Brush.none;
export let rotation: number = 0;
export const setBrush = (type: Brush, toggle: boolean = false) => {
  brush = toggle && type === brush ? Brush.none : type;
  ui.$set({ brush });
};

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
      { id: Brush.pole, name: 'Pole' },
    ],
  },
  target: document.getElementById('ui')!,
});

document.addEventListener('keydown', (e) => {
  if (e.repeat || !document.body.classList.contains('pointerlock')) {
    return;
  }
  switch (e.code) {
    case 'Digit1':
      setBrush(Brush.foundation, true);
      break;
    case 'Digit2':
      setBrush(Brush.wall, true);
      break;
    case 'Digit3':
      setBrush(Brush.belt, true);
      break;
    case 'Digit4':
      setBrush(Brush.buffer, true);
      break;
    case 'Digit5':
      setBrush(Brush.wire, true);
      break;
    case 'Digit6':
      setBrush(Brush.fabricator, true);
      break;
    case 'Digit7':
      setBrush(Brush.miner, true);
      break;
    case 'Digit8':
      setBrush(Brush.generator, true);
      break;
    case 'Digit9':
      setBrush(Brush.pole, true);
      break;
    case 'KeyR': {
      rotation += Math.PI * 0.125;
      while (rotation > Math.PI) rotation -= Math.PI * 2;
      break;
    }
    case 'KeyT': {
      rotation -= Math.PI * 0.125;
      while (rotation < -Math.PI) rotation += Math.PI * 2;
      break;
    }
  }
});

export const pick = (intersection: Intersection<Object3D<Event>>) => {
  if (intersection.object instanceof Instances) {
    rotation = intersection.object.getInstance(intersection.instanceId!).rotation;
  }
  if (intersection.object instanceof Belt) {
    setBrush(Brush.belt);
    return;
  }
  if (intersection.object instanceof Buffers) {
    setBrush(Brush.buffer);
    return;
  }
  if (intersection.object instanceof Fabricators) {
    setBrush(Brush.fabricator);
    return;
  }
  if (intersection.object instanceof Foundations) {
    setBrush(Brush.foundation);
    return;
  }
  if (intersection.object instanceof Generators) {
    setBrush(Brush.generator);
    return;
  }
  if (intersection.object instanceof Miners) {
    setBrush(Brush.miner);
    return;
  }
  if (intersection.object instanceof Poles) {
    setBrush(Brush.pole);
    return;
  }
  if (intersection.object instanceof Walls) {
    setBrush(Brush.wall);
    return;
  }
  if (intersection.object instanceof Wire) {
    setBrush(Brush.wire);
    return;
  }
};

const offsets = {
  [Brush.none]: new Vector3(),
  [Brush.belt]: new Vector3(),
  [Brush.buffer]: new Vector3(1, 1, 1),
  [Brush.fabricator]: new Vector3(2, 2, 1),
  [Brush.foundation]: new Vector3(2, 0.5, 2),
  [Brush.generator]: new Vector3(2, 1, 2),
  [Brush.miner]: new Vector3(1, 2, 1),
  [Brush.pole]: new Vector3(0.5, 2.5, 0.5),
  [Brush.wall]: new Vector3(2, 2, 0.25),
  [Brush.wire]: new Vector3(),
};
const terrainOffsets = (Object.keys(offsets) as any as Brush[]).reduce((terrainOffsets, key) => {
  terrainOffsets[key] = new Vector3(0, offsets[key].y, 0);
  return terrainOffsets;
}, {} as Record<Brush, Vector3>);

const quaternion = new Quaternion();
const rotatedDirection = new Vector3();
const rotatedOffset = new Vector3();
const rotatedBrushOffset = new Vector3();
const worldUp = new Vector3(0, 1, 0);
export const snap = (intersection: Intersection<Object3D<Event>>) => {
  if (intersection.object instanceof TerrainChunk) {
    return intersection.point.clone().add(terrainOffsets[brush]);
  }
  if (intersection.object instanceof Instances) {
    const instance = intersection.object.getInstance(intersection.instanceId!);
    const brushOffset = offsets[brush];
    let offset = offsets[Brush.none];
    if (intersection.object instanceof Buffers) {
      offset = offsets[Brush.buffer];
    } else if (intersection.object instanceof Fabricators) {
      offset = offsets[Brush.fabricator];
    } else if (intersection.object instanceof Foundations) {
      offset = offsets[Brush.foundation];
    } else if (intersection.object instanceof Generators) {
      offset = offsets[Brush.generator];
    } else if (intersection.object instanceof Miners) {
      offset = offsets[Brush.miner];
    } else if (intersection.object instanceof Poles) {
      offset = offsets[Brush.pole];
    } else if (intersection.object instanceof Walls) {
      offset = offsets[Brush.wall];
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
  return intersection.point;
};
