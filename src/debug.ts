import { Vector3 } from 'three';
import Belts from './objects/belts';
import Buffers from './objects/buffers';
import Fabricators from './objects/fabricators';
import Foundations from './objects/foundations';
import Generators  from './objects/generators';
import { Item, Recipes } from './objects/items';
import Miners from './objects/miners';
import Walls from './objects/walls';
import Wires from './objects/wires';

// @dani @hack?
// This thing definitely needs a way of serializing/deserializing
// the objects so premade stuff can be saved/loaded.
// But, in the meantime... here's a debug "factory".

export default (belts: Belts, buffers: Buffers, fabricators: Fabricators, foundations: Foundations, generators: Generators, miners: Miners, wires: Wires, walls: Walls) => {
  const generator = generators.create(new Vector3(12, 2.75, -6), 0);
  const minerA = miners.create(new Vector3(2, 2.5, -8), 0, Item.ore);
  const minerB = miners.create(new Vector3(2, 2.5, -6), 0, Item.ore);
  const minerC = miners.create(new Vector3(2, 2.5, -4), 0, Item.ore);
  const bufferA = buffers.create(new Vector3(-3, 1.5, -6), 0);
  const bufferB = buffers.create(new Vector3(-16, 1.5, -6), 0);
  const fabricatorA = fabricators.create(new Vector3(-8, 2.5, -6), 0);
  fabricatorA.setRecipe(Recipes.find(({ input, output }) => input.item === Item.ore && output.item == Item.capsule)!);
  const fabricatorB = fabricators.create(new Vector3(-16, 2.5, 0), Math.PI * 0.5);
  fabricatorB.setRecipe(Recipes.find(({ input, output }) => input.item === Item.capsule && output.item == Item.cylinder)!);
  const fabricatorC = fabricators.create(new Vector3(-16, 2.5, -12), Math.PI * 0.5);
  fabricatorC.setRecipe(Recipes.find(({ input, output }) => input.item === Item.capsule && output.item == Item.box)!);
  const sinkA = buffers.create(new Vector3(-16, -0.5, 8), 0);
  sinkA.setSink(true);
  const sinkB = buffers.create(new Vector3(-16, -0.5, -24), 0);
  sinkB.setSink(true);
  belts.create(
    {
      container: minerA,
      direction: new Vector3(-1, 0, 0)
    },
    {
      container: bufferA,
      direction: new Vector3(0, 0, -1)
    }
  );
  belts.create(
    {
      container: minerB,
      direction: new Vector3(-1, 0, 0)
    },
    {
      container: bufferA,
      direction: new Vector3(1, 0, 0)
    }
  );
  belts.create(
    {
      container: minerC,
      direction: new Vector3(-1, 0, 0)
    },
    {
      container: bufferA,
      direction: new Vector3(0, 0, 1)
    }
  );
  belts.create(
    {
      container: bufferA,
      direction: new Vector3(-1, 0, 0)
    },
    {
      container: fabricatorA,
      direction: new Vector3(1, 0, 0)
    }
  );
  belts.create(
    {
      container: fabricatorA,
      direction: new Vector3(-1, 0, 0)
    },
    {
      container: bufferB,
      direction: new Vector3(1, 0, 0)
    }
  );
  belts.create(
    {
      container: bufferB,
      direction: new Vector3(0, 0, 1)
    },
    {
      container: fabricatorB,
      direction: new Vector3(0, 0, -1)
    }
  );
  belts.create(
    {
      container: bufferB,
      direction: new Vector3(0, 0, -1)
    },
    {
      container: fabricatorC,
      direction: new Vector3(0, 0, 1)
    }
  );
  belts.create(
    {
      container: fabricatorB,
      direction: new Vector3(0, 0, 1)
    },
    {
      container: sinkA,
      direction: new Vector3(0, 0, -1)
    }
  );
  belts.create(
    {
      container: fabricatorC,
      direction: new Vector3(0, 0, -1)
    },
    {
      container: sinkB,
      direction: new Vector3(0, 0, 1)
    }
  );
  wires.create(generator, minerA);
  wires.create(generator, minerB);
  wires.create(generator, minerC);
  wires.create(minerB, fabricatorA);
  wires.create(fabricatorA, fabricatorB);
  wires.create(fabricatorA, fabricatorC);
  for (let z = -1; z < 1; z++) {
    for (let x = -2; x < 3; x++) {
      foundations.create(new Vector3(x * 4 - 8, 0, z * 4 - 4), 0);
    }
  }
  foundations.create(generator.position.clone().add(new Vector3(0, -1.5, 0)), 0);
  for (let i = 0; i < 8; i++) {
    foundations.create(fabricatorB.position.clone().add(new Vector3(0, -2.5 - i, 0)), 0);
    foundations.create(fabricatorC.position.clone().add(new Vector3(0, -2.5 - i, 0)), 0);
  }
  for (let i = 0; i < 2; i++) {
    walls.create(fabricatorA.position.clone().add(new Vector3(0, 0, i === 0 ? -1.25 : 1.25)), 0);
  }
  for (let i = 0; i < 2; i++) {
    walls.create(fabricatorB.position.clone().add(new Vector3(i === 0 ? -1.25 : 1.25, 0, 0)), Math.PI * 0.5);
    walls.create(fabricatorC.position.clone().add(new Vector3(i === 0 ? -1.25 : 1.25, 0, 0)), Math.PI * 0.5);
  }
  for (let i = 0; i < 2; i++) {
    walls.create(minerB.position.clone().add(new Vector3(1.25, 0, i * 4 - 2)), Math.PI * 0.5);
  }
};
