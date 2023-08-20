import {
  Object3D,
  Quaternion,
  Vector3,
} from 'three';
import { Instance } from './instances';
import { Intersection } from './physics';
import { Belt } from '../objects/belts';
import { Buffer } from '../objects/buffers';
import Deposit from '../objects/deposit';
import { Fabricator }  from '../objects/fabricators';
import { Foundation } from '../objects/foundations';
import { Generator } from '../objects/generators';
import { Miner } from '../objects/miners';
import { Pole } from '../objects/poles';
import { Smelter } from '../objects/smelters';
import { Wall } from '../objects/walls';
import { Wire } from '../objects/wires';

export enum Brush {
  none,
  belt,
  buffer,
  dismantle,
  fabricator,
  foundation,
  generator,
  miner,
  pole,
  smelter,
  wall,
  wire,
};

export let brush: Brush = Brush.none;
export let rotation: number = 0;

document.addEventListener('keydown', (e) => {
  if (e.repeat || !document.body.classList.contains('pointerlock')) {
    return;
  }
  switch (e.code) {
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

const listeners: ((brush: Brush) => void)[] = [];
export const set = (type: Brush) => {
  brush = type;
  listeners.forEach((listener) => listener(brush));
};

export const subscribe = (listener: (brush: Brush) => void) => {
  listeners.push(listener);
  listener(brush);
  return () => {
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    } 
  }
};

export const names: Record<Brush, string> = {
  [Brush.none]: 'None',
  [Brush.belt]: 'Belt',
  [Brush.buffer]: 'Buffer',
  [Brush.dismantle]: 'Dismantle',
  [Brush.fabricator]: 'Fabricator',
  [Brush.foundation]: 'Foundation',
  [Brush.generator]: 'Generator',
  [Brush.miner]: 'Miner',
  [Brush.pole]: 'Pole',
  [Brush.smelter]: 'Smelter',
  [Brush.wall]: 'Wall',
  [Brush.wire]: 'Wire',
};

export const getFromObject = (instance?: Instance | Belt | Wire) => {
  if (instance instanceof Belt) {
    return Brush.belt;
  }
  if (instance instanceof Buffer) {
    return Brush.buffer;
  }
  if (instance instanceof Fabricator) {
    return Brush.fabricator;
  }
  if (instance instanceof Foundation) {
    return Brush.foundation;
  }
  if (instance instanceof Generator) {
    return Brush.generator;
  }
  if (instance instanceof Miner) {
    return Brush.miner;
  }
  if (instance instanceof Pole) {
    return Brush.pole;
  }
  if (instance instanceof Smelter) {
    return Brush.smelter;
  }
  if (instance instanceof Wall) {
    return Brush.wall;
  }
  if (instance instanceof Wire) {
    return Brush.wire;
  }
  return Brush.none;
};

export const pick = (intersection: Intersection) => {
  if (
    intersection.object instanceof Instance
    || intersection.object instanceof Belt
    || intersection.object instanceof Wire
  ) {
    set(getFromObject(intersection.object));
  }
  if (intersection.object instanceof Instance) {
    rotation = intersection.object.rotation;
  }
};

const offsets = {
  [Brush.none]: new Vector3(),
  [Brush.belt]: new Vector3(),
  [Brush.buffer]: new Vector3(1, 1, 1),
  [Brush.dismantle]: new Vector3(),
  [Brush.fabricator]: new Vector3(2, 2, 1),
  [Brush.foundation]: new Vector3(2, 0.5, 2),
  [Brush.generator]: new Vector3(2, 6, 2),
  [Brush.miner]: new Vector3(1, 2, 1),
  [Brush.pole]: new Vector3(0.5, 3, 0.5),
  [Brush.smelter]: new Vector3(2, 2, 1),
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
export const snap = (intersection: Intersection) => {
  if (intersection.object instanceof Deposit && brush === Brush.miner) {
    return intersection.object.localToWorld(new Vector3(0, 2, 0)).add(terrainOffsets[brush]);
  }
  if (intersection.object instanceof Instance) {
    const brushOffset = offsets[brush];
    const offset = offsets[getFromObject(intersection.object)];

    quaternion.setFromAxisAngle(Object3D.DEFAULT_UP, intersection.object.rotation);
    rotatedOffset.copy(offset).multiply(intersection.normal).applyQuaternion(quaternion);

    rotatedDirection.copy(intersection.normal).applyQuaternion(quaternion);
    quaternion.setFromAxisAngle(Object3D.DEFAULT_UP, -rotation);
    rotatedDirection.applyQuaternion(quaternion);
    quaternion.invert();
    rotatedBrushOffset.copy(brushOffset).multiply(rotatedDirection).applyQuaternion(quaternion);

    return intersection.object.position.clone()
      .add(rotatedOffset)
      .add(rotatedBrushOffset);
  }
  return intersection.point.clone().add(terrainOffsets[brush]);
};
