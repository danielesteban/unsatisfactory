export enum Brush {
  none,
  aggregator,
  belt,
  buffer,
  column,
  combinator,
  dismantle,
  fabricator,
  foundation,
  turbine,
  miner,
  pillar,
  pole,
  ramp,
  sink,
  smelter,
  storage,
  wall,
  wire,
  generator,
  lab,
  beacon,
  foundry,
  tesseract,
}

export const BrushGroups: Exclude<Brush, Brush.none>[][] = [
  [
    Brush.foundation,
    Brush.pillar,
    Brush.ramp,
    Brush.column,
    Brush.wall,
  ],
  [
    Brush.fabricator,
    Brush.combinator,
    Brush.aggregator,
    Brush.smelter,
    Brush.foundry,
  ],
  [
    Brush.belt,
    Brush.buffer,
    Brush.tesseract,
    Brush.pole,
    Brush.wire,
  ],
  [
    Brush.beacon,
    Brush.lab,
    Brush.sink,
    Brush.storage,
  ],
  [
    Brush.miner,
    Brush.generator,
    Brush.turbine,
  ],
];

export const BrushName: Record<Brush, string> = {
  [Brush.none]: 'None',
  [Brush.aggregator]: 'Aggregator',
  [Brush.beacon]: 'Beacon',
  [Brush.belt]: 'Belt',
  [Brush.buffer]: 'Buffer',
  [Brush.column]: 'Column',
  [Brush.dismantle]: 'Dismantle',
  [Brush.combinator]: 'Combinator',
  [Brush.fabricator]: 'Fabricator',
  [Brush.foundation]: 'Foundation',
  [Brush.foundry]: 'Foundry',
  [Brush.generator]: 'Power Plant',
  [Brush.lab]: 'Lab',
  [Brush.miner]: 'Miner',
  [Brush.pillar]: 'Pillar',
  [Brush.pole]: 'Pole',
  [Brush.ramp]: 'Ramp',
  [Brush.sink]: 'Sink',
  [Brush.smelter]: 'Smelter',
  [Brush.storage]: 'Storage',
  [Brush.tesseract]: 'Tesseract',
  [Brush.turbine]: 'Wind Turbine',
  [Brush.wall]: 'Wall',
  [Brush.wire]: 'Wire',
};

export enum Item {
  none,
  wire,
  ironPlate,
  ironIngot,
  ironOre,
  rotor,
  copperIngot,
  copperOre,
  ironRod,
  frame,
  computer,
  coal,
  steelIngot,
  steelPlate,
}

export const ItemName: Record<Item, string>  = {
  [Item.none]: 'None',
  [Item.coal]: 'Coal',
  [Item.computer]: 'Computer',
  [Item.copperIngot]: 'Copper Ingot',
  [Item.copperOre]: 'Copper Ore',
  [Item.frame]: 'Frame',
  [Item.ironIngot]: 'Iron Ingot',
  [Item.ironOre]: 'Iron Ore',
  [Item.ironPlate]: 'Iron Plate',
  [Item.ironRod]: 'Iron Rod',
  [Item.rotor]: 'Rotor',
  [Item.steelIngot]: 'Steel Ingot',
  [Item.steelPlate]: 'Steel Plate',
  [Item.wire]: 'Wire',
};

export type BuildCost = { item: Exclude<Item, Item.none>; count: number; }[];

export const defaultBuildCost: BuildCost = [
  { item: Item.ironPlate, count: 1 },
];

export const Building: Partial<Record<Brush, BuildCost>> = {
  [Brush.aggregator]: [
    { item: Item.rotor, count: 5 },
    { item: Item.frame, count: 10 },
    { item: Item.wire, count: 50 },
  ],
  [Brush.beacon]: [
    { item: Item.ironRod, count: 5 },
  ],
  [Brush.buffer]: [
    { item: Item.ironPlate, count: 5 },
  ],
  [Brush.combinator]: [
    { item: Item.ironPlate, count: 10 },
    { item: Item.ironRod, count: 10 },
    { item: Item.wire, count: 20 },
  ],
  [Brush.fabricator]: [
    { item: Item.ironRod, count: 5 },
    { item: Item.wire, count: 10 },
  ],
  [Brush.foundry]: [
    { item: Item.frame, count: 10 },
    { item: Item.wire, count: 10 },
  ],
  [Brush.generator]: [
    { item: Item.ironPlate, count: 20 },
    { item: Item.wire, count: 10 },
  ],
  [Brush.lab]: [
    { item: Item.ironPlate, count: 10 },
    { item: Item.ironRod, count: 10 },
    { item: Item.wire, count: 20 },
  ],
  [Brush.miner]: [
    { item: Item.ironPlate, count: 10 },
    { item: Item.wire, count: 5 },
  ],
  [Brush.pole]: [
    { item: Item.ironRod, count: 5 },
    { item: Item.wire, count: 5 },
  ],
  [Brush.sink]: [
    { item: Item.ironPlate, count: 10 },
    { item: Item.wire, count: 20 },
  ],
  [Brush.smelter]: [
    { item: Item.ironRod, count: 5 },
    { item: Item.wire, count: 10 },
  ],
  [Brush.storage]: [
    { item: Item.ironPlate, count: 10 },
    { item: Item.ironRod, count: 10 },
  ],
  [Brush.tesseract]: [
    { item: Item.computer, count: 5 },
    { item: Item.steelPlate, count: 20 },
  ],
  [Brush.turbine]: [
    { item: Item.ironPlate, count: 20 },
    { item: Item.wire, count: 10 },
  ],
  [Brush.wire]: [
    { item: Item.wire, count: 1 },
  ],
};

export const Consumption: Partial<Record<Brush, number>> = {
  [Brush.aggregator]: 50,
  [Brush.combinator]: 20,
  [Brush.fabricator]: 10,
  [Brush.foundry]: 40,
  [Brush.lab]: 30,
  [Brush.sink]: 30,
  [Brush.smelter]: 10,
  [Brush.tesseract]: 100,
};

export const Generation: Partial<Record<Item, { count: number; rate: number; power: number; }>> = {
  [Item.coal]: { count: 10, rate: 60, power: 500 },
};

export const Mining: Partial<Record<Item, { consumption: number; count: number; rate: number; }>> = {
  [Item.coal]: { consumption: 100, count: 20, rate: 20 },
  [Item.copperOre]: { consumption: 100, count: 20, rate: 20 },
  [Item.ironOre]: { consumption: 100, count: 20, rate: 20 },
};

export const Researching: { name: string, brushes: Exclude<Brush, Brush.none>[], input: { item: Exclude<Item, Item.none>; count: number; }[]; rate: number; }[] = [
  {
    name: 'Logistics',
    brushes: [
      Brush.belt,
      Brush.buffer,
      Brush.pole,
    ],
    input: [
      {
        item: Item.ironPlate,
        count: 100,
      },
      {
        item: Item.wire,
        count: 200,
      }
    ],
    rate: 100,
  },
  {
    name: 'Manufacturing',
    brushes: [
      Brush.combinator,
      Brush.storage,
    ],
    input: [
      {
        item: Item.ironRod,
        count: 100,
      },
      {
        item: Item.ironPlate,
        count: 200,
      },
      {
        item: Item.wire,
        count: 300,
      }
    ],
    rate: 200,
  },
  {
    name: 'Coal & Steel',
    brushes: [
      Brush.generator,
      Brush.foundry,
    ],
    input: [
      {
        item: Item.rotor,
        count: 50,
      },
      {
        item: Item.ironPlate,
        count: 300,
      },
      {
        item: Item.wire,
        count: 600,
      }
    ],
    rate: 300,
  },
  {
    name: 'Advanced Manufacturing',
    brushes: [
      Brush.aggregator,
      Brush.sink,
    ],
    input: [
      {
        item: Item.frame,
        count: 100,
      },
      {
        item: Item.rotor,
        count: 100,
      },
      {
        item: Item.wire,
        count: 1000,
      },
    ],
    rate: 400,
  },
  {
    name: 'Four-Dimensional Logistics',
    brushes: [
      Brush.tesseract,
    ],
    input: [
      {
        item: Item.computer,
        count: 500,
      },
    ],
    rate: 500,
  },
  {
    name: 'Architecture',
    brushes: [
      Brush.column,
      Brush.ramp,
      Brush.wall,
    ],
    input: [
      {
        item: Item.ironRod,
        count: 50,
      },
      {
        item: Item.ironPlate,
        count: 100,
      },
    ],
    rate: 50,
  },
];

export const Sinking: Partial<Record<Item, number>> = {
  [Item.computer]: 64,
  [Item.copperIngot]: 2,
  [Item.frame]: 32,
  [Item.ironIngot]: 2,
  [Item.ironPlate]: 4,
  [Item.ironRod]: 4,
  [Item.rotor]: 32,
  [Item.steelIngot]: 4,
  [Item.steelPlate]: 8,
  [Item.wire]: 4,
};

export enum Transformer {
  aggregator,
  combinator,
  fabricator,
  foundry,
  smelter,
}

export const TransformerName = {
  [Transformer.aggregator]: 'Aggregator',
  [Transformer.combinator]: 'Combinator',
  [Transformer.fabricator]: 'Fabricator',
  [Transformer.foundry]: 'Foundry',
  [Transformer.smelter]: 'Smelter',
};

export type Recipe = {
  input: { item: Exclude<Item, Item.none>; count: number; }[];
  output: { item: Exclude<Item, Item.none>; count: number; };
  rate: number;
  transformer: Transformer;
};

export const Recipes: Recipe[] = [
  {
    input: [{
      item: Item.copperOre,
      count: 1,
    }],
    output: {
      item: Item.copperIngot,
      count: 1,
    },
    rate: 10,
    transformer: Transformer.smelter,
  },
  {
    input: [{
      item: Item.ironOre,
      count: 1,
    }],
    output: {
      item: Item.ironIngot,
      count: 1,
    },
    rate: 10,
    transformer: Transformer.smelter,
  },
  {
    input: [{
      item: Item.ironIngot,
      count: 1,
    }],
    output: {
      item: Item.ironPlate,
      count: 1,
    },
    rate: 10,
    transformer: Transformer.fabricator,
  },
  {
    input: [{
      item: Item.ironIngot,
      count: 1,
    }],
    output: {
      item: Item.ironRod,
      count: 1,
    },
    rate: 20,
    transformer: Transformer.fabricator,
  },
  {
    input: [{
      item: Item.copperIngot,
      count: 1,
    }],
    output: {
      item: Item.wire,
      count: 2,
    },
    rate: 20,
    transformer: Transformer.fabricator,
  },
  {
    input: [
      {
        item: Item.ironRod,
        count: 3,
      },
      {
        item: Item.wire,
        count: 6,
      }
    ],
    output: {
      item: Item.rotor,
      count: 1,
    },
    rate: 30,
    transformer: Transformer.combinator,
  },
  {
    input: [
      {
        item: Item.ironPlate,
        count: 12,
      },
      {
        item: Item.ironRod,
        count: 12,
      }
    ],
    output: {
      item: Item.frame,
      count: 1,
    },
    rate: 60,
    transformer: Transformer.combinator,
  },
  {
    input: [
      {
        item: Item.frame,
        count: 2,
      },
      {
        item: Item.rotor,
        count: 2,
      },
      {
        item: Item.wire,
        count: 24,
      }
    ],
    output: {
      item: Item.computer,
      count: 1,
    },
    rate: 120,
    transformer: Transformer.aggregator,
  },
  {
    input: [
      {
        item: Item.ironOre,
        count: 1,
      },
      {
        item: Item.coal,
        count: 1,
      }
    ],
    output: {
      item: Item.steelIngot,
      count: 1,
    },
    rate: 10,
    transformer: Transformer.foundry,
  },
  {
    input: [{
      item: Item.steelIngot,
      count: 1,
    }],
    output: {
      item: Item.steelPlate,
      count: 1,
    },
    rate: 10,
    transformer: Transformer.fabricator,
  },
];
