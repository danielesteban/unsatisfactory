import Container from './container';
import Belts, { Belt } from '../objects/belts';
import Buffers, { Buffer } from '../objects/buffers';
import Fabricators, { Fabricator } from '../objects/fabricators';
import Foundations from '../objects/foundations';
import Generators, { Generator }  from '../objects/generators';
import Miners, { Miner } from '../objects/miners';
import Walls from '../objects/walls';
import Wires, { Wire } from '../objects/wires';

const version = 1;

export const serialize = (belts: Belts, buffers: Buffers, fabricators: Fabricators, foundations: Foundations, generators: Generators, miners: Miners, wires: Wires, walls: Walls) => {
  const containers = new WeakMap();
  const serializeInstances = (instances: Buffers | Fabricators | Foundations | Generators | Miners | Walls) => (
    Array.from({ length: instances.count }, (_v, i) => {
      const instance = instances.getInstance(i);
      if (instance instanceof Container) {
        containers.set(instance, i);
      }
      return instance.serialize();
    })
  );
  const serializeContainer = (instance: Container) => {
    let key;
    if (instance instanceof Buffer) {
      key = 0;
    }
    if (instance instanceof Fabricator) {
      key = 1;
    }
    if (instance instanceof Generator) {
      key = 2;
    }
    if (instance instanceof Miner) {
      key = 3;
    }
    return [key, containers.get(instance)];
  };
  return {
    buffers: serializeInstances(buffers),
    fabricators: serializeInstances(fabricators),
    foundations: serializeInstances(foundations),
    generators: serializeInstances(generators),
    miners: serializeInstances(miners),
    walls: serializeInstances(walls),
    belts: (belts.children as Belt[]).map((belt) => [
      serializeContainer(belt.from.container),
      belt.from.direction.toArray(),
      serializeContainer(belt.to.container),
      belt.to.direction.toArray(),
    ]),
    wires: (wires.children as Wire[]).map((wire) => [
      serializeContainer(wire.from),
      serializeContainer(wire.to),
    ]),
    version,
  };
};
