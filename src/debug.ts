import { Camera, Vector3 } from 'three';
import Belts from './objects/belts';
import Buffers from './objects/buffers';
import Fabricators from './objects/fabricators';
import Foundations from './objects/foundations';
import Generators  from './objects/generators';
import { Item, Recipes } from './objects/items';
import Miners from './objects/miners';
import Poles from './objects/poles';
import Smelters from './objects/smelters';
import Walls from './objects/walls';
import Wires from './objects/wires';

export default (
  belts: Belts, buffers: Buffers, fabricators: Fabricators, foundations: Foundations, generators: Generators, miners: Miners, poles: Poles, smelters: Smelters, walls: Walls, wires: Wires,
  camera: Camera
) => {
  const generator = generators.create(new Vector3(12, 8, -6), 0);
  const poleA = poles.create(generator.position.clone().add(new Vector3(-1, -4, -8)), 0);
  const poleB = poles.create(generator.position.clone().add(new Vector3(-20, -6, -12)), 0);
  const miner = miners.create(new Vector3(0, 2.5, -6), 0, Item.ore);
  const buffer = buffers.create(new Vector3(-16, 1.5, -6), 0);
  const smelter = smelters.create(
    new Vector3(-8, 2.5, -6), 0,
    Recipes.find(({ input, output }) => input.item === Item.ore && output.item == Item.ingot)!
  );
  const fabricatorA = fabricators.create(
    new Vector3(-16, 2.5, 0), Math.PI * 0.5,
    Recipes.find(({ input, output }) => input.item === Item.ingot && output.item == Item.cylinder)!
  );
  const fabricatorB = fabricators.create(
    new Vector3(-16, 2.5, -12), Math.PI * 0.5,
    Recipes.find(({ input, output }) => input.item === Item.ingot && output.item == Item.box)!
  );
  const sinkA = buffers.create(new Vector3(-16, -0.5, 8), 0);
  sinkA.setSink(true);
  const sinkB = buffers.create(new Vector3(-16, -0.5, -24), 0);
  sinkB.setSink(true);
  belts.create(
    {
      container: miner,
      direction: new Vector3(-1, 0, 0)
    },
    {
      container: smelter,
      direction: new Vector3(1, 0, 0)
    }
  );
  belts.create(
    {
      container: smelter,
      direction: new Vector3(-1, 0, 0)
    },
    {
      container: buffer,
      direction: new Vector3(1, 0, 0)
    }
  );
  belts.create(
    {
      container: buffer,
      direction: new Vector3(0, 0, 1)
    },
    {
      container: fabricatorA,
      direction: new Vector3(0, 0, -1)
    }
  );
  belts.create(
    {
      container: buffer,
      direction: new Vector3(0, 0, -1)
    },
    {
      container: fabricatorB,
      direction: new Vector3(0, 0, 1)
    }
  );
  belts.create(
    {
      container: fabricatorA,
      direction: new Vector3(0, 0, 1)
    },
    {
      container: sinkA,
      direction: new Vector3(0, 0, -1)
    }
  );
  belts.create(
    {
      container: fabricatorB,
      direction: new Vector3(0, 0, -1)
    },
    {
      container: sinkB,
      direction: new Vector3(0, 0, 1)
    }
  );
  wires.create(generator, miner);
  wires.create(generator, poleA)
  wires.create(poleA, poleB);
  wires.create(poleB, smelter);
  wires.create(poleB, fabricatorA);
  wires.create(poleB, fabricatorB);
  for (let z = -1; z < 1; z++) {
    for (let x = -2; x < 3; x++) {
      foundations.create(new Vector3(x * 4 - 8, 0, z * 4 - 4), 0);
    }
  }
  foundations.create(generator.position.clone().add(new Vector3(0, -6.5, 0)), 0);
  for (let i = 0; i < 8; i++) {
    foundations.create(fabricatorA.position.clone().add(new Vector3(0, -2.5 - i, 0)), 0);
    foundations.create(fabricatorB.position.clone().add(new Vector3(0, -2.5 - i, 0)), 0);
    foundations.create(poleB.position.clone().add(new Vector3(0, -3.5 - i, 0)), 0);
  }
  for (let i = 0; i < 2; i++) {
    walls.create(fabricatorA.position.clone().add(new Vector3(i === 0 ? -1.25 : 1.25, 0, 0)), Math.PI * 0.5);
    walls.create(fabricatorB.position.clone().add(new Vector3(i === 0 ? -1.25 : 1.25, 0, 0)), Math.PI * 0.5);
  }
  walls.create(miner.position.clone().add(new Vector3(1.75, 0, 0)), Math.PI * 0.5);
  camera.position.set(-3.9429288933161484, 0.6016078360809738, 23.340531643778625);
  camera.userData.targetPosition.copy(camera.position);
};
