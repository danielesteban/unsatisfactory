import { Vector3 } from 'three';
import Container, { PoweredContainer } from './container';
import Belts, { Belt } from '../objects/belts';
import Buffers, { Buffer } from '../objects/buffers';
import Fabricators, { Fabricator } from '../objects/fabricators';
import Foundations from '../objects/foundations';
import Generators, { Generator }  from '../objects/generators';
import { Recipes }  from '../objects/items';
import Miners, { Miner } from '../objects/miners';
import Walls from '../objects/walls';
import Wires, { Wire } from '../objects/wires';

const version = 1;

export const serialize = (belts: Belts, buffers: Buffers, fabricators: Fabricators, foundations: Foundations, generators: Generators, miners: Miners, walls: Walls, wires: Wires) => {
  const containers = new WeakMap<Container, number>();
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

export const deserialize = (
  serialized: ReturnType<typeof serialize>,
  belts: Belts, buffers: Buffers, fabricators: Fabricators, foundations: Foundations, generators: Generators, miners: Miners, walls: Walls, wires: Wires
) => {
  const aux = new Vector3();
  const auxB = new Vector3();
  const containers = [
    (serialized.buffers as [number[], number, number][]).map(([position, rotation, sink]) => {
      const buffer = buffers.create(aux.fromArray(position), rotation);
      if (sink) {
        buffer.setSink(true);
      }
      return buffer;
    }),
    (serialized.fabricators as [number[], number, number, number][]).map(([position, rotation, enabled, recipe]) => {
      const fabricator = fabricators.create(aux.fromArray(position), rotation, Recipes[recipe]);
      if (!enabled) {
        fabricator.setEnabled(false);
      }
      return fabricator;
    }),
    (serialized.generators as [number[], number, number][]).map(([position, rotation, enabled]) => {
      const generator = generators.create(aux.fromArray(position), rotation)
      if (!enabled) {
        generator.setEnabled(false);
      }
      return generator;
    }),
    (serialized.miners as [number[], number, number, number][]).map(([position, rotation, enabled, item]) => {
      const miner = miners.create(aux.fromArray(position), rotation, item);
      if (!enabled) {
        miner.setEnabled(false);
      }
      return miner;
    }),
  ];
  (serialized.foundations as [number[], number][]).forEach(([position, rotation]) => (
    foundations.create(aux.fromArray(position), rotation)
  ));
  (serialized.walls as [number[], number][]).forEach(([position, rotation]) => (
    walls.create(aux.fromArray(position), rotation)
  ));
  (serialized.belts as [number[], number[], number[], number[]][]).forEach(([from, fromDirection, to, toDirection]) => (
    belts.create(
      { container: containers[from[0]][from[1]], direction: aux.fromArray(fromDirection) },
      { container: containers[to[0]][to[1]], direction: auxB.fromArray(toDirection) },
    )
  ));
  (serialized.wires as [number[], number[]][]).forEach(([from, to]) => (
    wires.create(
      containers[from[0]][from[1]] as PoweredContainer,
      containers[to[0]][to[1]] as PoweredContainer,
    )
  ));
};
