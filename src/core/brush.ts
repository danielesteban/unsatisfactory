import {
  BufferGeometry,
  MeshBasicMaterial,
  Object3D,
  Quaternion,
  Vector3,
} from 'three';
import { Brush } from './data';
import { Instance } from './instances';
import { Intersection } from './physics';
import Aggregators, { Aggregator }  from '../objects/aggregators';
import Beacons, { Beacon } from '../objects/beacons';
import Belts, { Belt } from '../objects/belts';
import Buffers, { Buffer } from '../objects/buffers';
import Columns, { Column } from '../objects/columns';
import Deposit from '../objects/deposit';
import Combinators, { Combinator }  from '../objects/combinators';
import Fabricators, { Fabricator }  from '../objects/fabricators';
import Foundations, { Foundation } from '../objects/foundations';
import Foundries, { Foundry } from '../objects/foundries';
import Generators, { Generator } from '../objects/generators';
import Labs, { Lab } from '../objects/labs';
import Miners, { Miner } from '../objects/miners';
import Pillars, { Pillar } from '../objects/pillars';
import Poles, { Pole } from '../objects/poles';
import Ramps, { Ramp } from '../objects/ramps';
import Sinks, { Sink } from '../objects/sinks';
import Smelters, { Smelter } from '../objects/smelters';
import Storages, { Storage } from '../objects/storages';
import Tesseracts, { Tesseract } from '../objects/tesseracts';
import Turbines, { Turbine } from '../objects/turbines';
import Walls, { Wall } from '../objects/walls';
import Wires, { Wire } from '../objects/wires';

// @dani This file is unjustifiably awful

export let brush: Brush = Brush.none;
export let rotation: number = 0;

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

export const getFromObject = (instance?: Instance | Belt | Wire) => {
  if (instance instanceof Aggregator) {
    return Brush.aggregator;
  }
  if (instance instanceof Beacon) {
    return Brush.beacon;
  }
  if (instance instanceof Belt) {
    return Brush.belt;
  }
  if (instance instanceof Buffer) {
    return Brush.buffer;
  }
  if (instance instanceof Column) {
    return Brush.column;
  }
  if (instance instanceof Combinator) {
    return Brush.combinator;
  }
  if (instance instanceof Fabricator) {
    return Brush.fabricator;
  }
  if (instance instanceof Foundation) {
    return Brush.foundation;
  }
  if (instance instanceof Foundry) {
    return Brush.foundry;
  }
  if (instance instanceof Generator) {
    return Brush.generator;
  }
  if (instance instanceof Lab) {
    return Brush.lab;
  }
  if (instance instanceof Miner) {
    return Brush.miner;
  }
  if (instance instanceof Pillar) {
    return Brush.pillar;
  }
  if (instance instanceof Pole) {
    return Brush.pole;
  }
  if (instance instanceof Ramp) {
    return Brush.ramp;
  }
  if (instance instanceof Sink) {
    return Brush.sink;
  }
  if (instance instanceof Smelter) {
    return Brush.smelter;
  }
  if (instance instanceof Storage) {
    return Brush.storage;
  }
  if (instance instanceof Tesseract) {
    return Brush.tesseract;
  }
  if (instance instanceof Turbine) {
    return Brush.turbine;
  }
  if (instance instanceof Wall) {
    return Brush.wall;
  }
  if (instance instanceof Wire) {
    return Brush.wire;
  }
  return Brush.none;
};

export const getGeometry = (brush: Brush) => {
  switch (brush) {
    case Brush.aggregator:
      return Aggregators.getGeometry();
    case Brush.beacon:
      return Beacons.getGeometry();
    case Brush.buffer:
      return Buffers.getGeometry();
    case Brush.column:
      return Columns.getGeometry();
    case Brush.combinator:
      return Combinators.getGeometry();
    case Brush.fabricator:
      return Fabricators.getGeometry();
    case Brush.foundation:
      return Foundations.getGeometry();
    case Brush.foundry:
      return Foundries.getGeometry();
    case Brush.generator:
      return Generators.getGeometry();
    case Brush.lab:
      return Labs.getGeometry();
    case Brush.miner:
      return Miners.getGeometry();
    case Brush.pillar:
      return Pillars.getGeometry();
    case Brush.pole:
      return Poles.getGeometry();
    case Brush.ramp:
      return Ramps.getGeometry();
    case Brush.sink:
      return Sinks.getGeometry();
    case Brush.smelter:
      return Smelters.getGeometry();
    case Brush.storage:
      return Storages.getGeometry();
    case Brush.tesseract:
      return Tesseracts.getGeometry();
    case Brush.turbine:
      return Turbines.getGeometry();
    case Brush.wall:
      return Walls.getGeometry();
    default:
      return new BufferGeometry();
  }
};

export const getMaterial = (brush: Brush) => {
  switch (brush) {
    case Brush.aggregator:
      return Aggregators.getMaterial();
    case Brush.beacon:
      return Beacons.getMaterial();
    case Brush.belt:
      return Belts.getMaterial();
    case Brush.buffer:
      return Buffers.getMaterial();
    case Brush.column:
      return Columns.getMaterial();
    case Brush.combinator:
      return Combinators.getMaterial();
    case Brush.fabricator:
      return Fabricators.getMaterial();
    case Brush.foundation:
      return Foundations.getMaterial();
    case Brush.foundry:
      return Foundries.getMaterial();
    case Brush.generator:
      return Generators.getMaterial();
    case Brush.lab:
      return Labs.getMaterial();
    case Brush.miner:
      return Miners.getMaterial();
    case Brush.pillar:
      return Pillars.getMaterial();
    case Brush.pole:
      return Poles.getMaterial();
    case Brush.ramp:
      return Ramps.getMaterial();
    case Brush.sink:
      return Sinks.getMaterial();
    case Brush.smelter:
      return Smelters.getMaterial();
    case Brush.storage:
      return Storages.getMaterial();
    case Brush.tesseract:
      return Tesseracts.getMaterial();
    case Brush.turbine:
      return Turbines.getMaterial();
    case Brush.wall:
      return Walls.getMaterial();
    case Brush.wire:
      return Wires.getMaterial();
    default:
      return new MeshBasicMaterial();
  }
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

export const rotate = (direction: number) => {
  rotation += Math.PI * 0.125 * direction;
  while (rotation > Math.PI) rotation -= Math.PI * 2;
  while (rotation < -Math.PI) rotation += Math.PI * 2;
};

const offsets = {
  [Brush.none]: new Vector3(),
  [Brush.aggregator]: new Vector3(4, 2, 4),
  [Brush.beacon]: new Vector3(0.5, 1.75, 0.5),
  [Brush.belt]: new Vector3(),
  [Brush.buffer]: new Vector3(1, 1, 1),
  [Brush.column]: new Vector3(0.5, 2, 0.5),
  [Brush.combinator]: new Vector3(2, 2, 2),
  [Brush.dismantle]: new Vector3(),
  [Brush.fabricator]: new Vector3(2, 2, 1),
  [Brush.foundation]: new Vector3(2, 0.5, 2),
  [Brush.foundry]: new Vector3(2, 2, 1),
  [Brush.generator]: new Vector3(3, 4, 1),
  [Brush.lab]: new Vector3(2, 2, 2),
  [Brush.miner]: new Vector3(1, 2, 1),
  [Brush.pillar]: new Vector3(2, 2, 2),
  [Brush.pole]: new Vector3(0.5, 3, 0.5),
  [Brush.ramp]: new Vector3(2, 1, 2),
  [Brush.sink]: new Vector3(2, 2, 2),
  [Brush.smelter]: new Vector3(2, 2, 1),
  [Brush.storage]: new Vector3(2, 2, 1),
  [Brush.tesseract]: new Vector3(1, 1, 1),
  [Brush.turbine]: new Vector3(2, 6, 2),
  [Brush.wall]: new Vector3(2, 2, 0.25),
  [Brush.wire]: new Vector3(),
};
const terrainOffsets = (Object.keys(offsets) as any as Brush[]).reduce((terrainOffsets, key) => {
  terrainOffsets[key] = new Vector3(0, offsets[key].y, 0);
  return terrainOffsets;
}, {} as Record<Brush, Vector3>);

const quaternion = new Quaternion();
const objectNormal = new Vector3();
const objectPosition = new Vector3();
const rotatedDirection = new Vector3();
const rotatedOffset = new Vector3();
const rotatedBrushOffset = new Vector3();
const worldEast = new Vector3(1, 0, 0);
const worldSouth = new Vector3(0, 0, 1);
export const snap = (intersection: Intersection) => {
  if (intersection.object instanceof Deposit && brush === Brush.miner) {
    return intersection.object.localToWorld(new Vector3(0, 2, 0)).add(terrainOffsets[brush]);
  }
  if (intersection.object instanceof Instance) {
    const brushOffset = offsets[brush];
    const offset = offsets[getFromObject(intersection.object)];

    const objectQuaternion = Instance.getQuaternion(intersection.object, true);
    objectNormal.copy(intersection.normal).applyQuaternion(objectQuaternion);

    objectPosition.copy(intersection.point).sub(intersection.object.position).applyQuaternion(objectQuaternion);
    if (Math.abs(objectNormal.dot(Object3D.DEFAULT_UP)) > 0.001) {  
      objectPosition.y = 0;
    } else if (Math.abs(objectNormal.dot(worldEast)) > 0.001) {  
      objectPosition.x = 0;
    } else if (Math.abs(objectNormal.dot(worldSouth)) > 0.001) {  
      objectPosition.z = 0;
    }
    objectPosition.round();
  
    rotatedOffset
      .copy(offset)
      .multiply(objectNormal)
      .add(objectPosition)
      .applyQuaternion(Instance.getQuaternion(intersection.object));

    rotatedDirection.copy(intersection.normal).applyQuaternion(quaternion.setFromAxisAngle(Object3D.DEFAULT_UP, -rotation));
    rotatedBrushOffset.copy(brushOffset).multiply(rotatedDirection).applyQuaternion(quaternion.setFromAxisAngle(Object3D.DEFAULT_UP, rotation));

    return intersection.object.position.clone()
      .add(rotatedOffset)
      .add(rotatedBrushOffset);
  }
  return intersection.point.clone().add(terrainOffsets[brush]);
};
