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
  generator,
  miner,
  pillar,
  pole,
  ramp,
  sink,
  smelter,
  storage,
  wall,
  wire,
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
    Brush.miner,
    Brush.smelter,
    Brush.fabricator,
    Brush.combinator,
    Brush.aggregator,
  ],
  [
    Brush.belt,
    Brush.buffer,
    Brush.sink,
    Brush.storage,
  ],
  [
    Brush.generator,
    Brush.pole,
    Brush.wire,
  ],
];

export const BrushName: Record<Brush, string> = {
  [Brush.none]: 'None',
  [Brush.aggregator]: 'Aggregator',
  [Brush.belt]: 'Belt',
  [Brush.buffer]: 'Buffer',
  [Brush.column]: 'Column',
  [Brush.dismantle]: 'Dismantle',
  [Brush.combinator]: 'Combinator',
  [Brush.fabricator]: 'Fabricator',
  [Brush.foundation]: 'Foundation',
  [Brush.generator]: 'Generator',
  [Brush.miner]: 'Miner',
  [Brush.pillar]: 'Pillar',
  [Brush.pole]: 'Pole',
  [Brush.ramp]: 'Ramp',
  [Brush.sink]: 'Sink',
  [Brush.smelter]: 'Smelter',
  [Brush.storage]: 'Storage',
  [Brush.wall]: 'Wall',
  [Brush.wire]: 'Wire',
};

export const BrushTier: Partial<Record<Brush, number>> = {
  [Brush.aggregator]: 1,
  [Brush.column]: 1,
  [Brush.combinator]: 1,
  [Brush.pillar]: 1,
  [Brush.ramp]: 1,
  [Brush.storage]: 1,
  [Brush.wall]: 1,
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
}

export const ItemName: Record<Item, string>  = {
  [Item.none]: 'None',
  [Item.computer]: 'Computer',
  [Item.copperIngot]: 'Copper Ingot',
  [Item.copperOre]: 'Copper Ore',
  [Item.frame]: 'Frame',
  [Item.ironIngot]: 'Iron Ingot',
  [Item.ironOre]: 'Iron Ore',
  [Item.ironPlate]: 'Iron Plate',
  [Item.ironRod]: 'Iron Rod',
  [Item.rotor]: 'Rotor',
  [Item.wire]: 'Wire',
};

export type BuildCost = { item: Exclude<Item, Item.none>; count: number; }[];

export const defaultBuildCost: BuildCost = [
  { item: Item.ironPlate, count: 1 },
];

export const Building = {
  [Brush.aggregator]: [
    { item: Item.rotor, count: 5 },
    { item: Item.frame, count: 10 },
    { item: Item.wire, count: 50 },
  ] as BuildCost,
  [Brush.buffer]: [
    { item: Item.ironPlate, count: 5 },
  ] as BuildCost,
  [Brush.combinator]: [
    { item: Item.ironPlate, count: 10 },
    { item: Item.ironRod, count: 10 },
    { item: Item.wire, count: 20 },
  ] as BuildCost,
  [Brush.fabricator]: [
    { item: Item.ironRod, count: 5 },
    { item: Item.wire, count: 10 },
  ] as BuildCost,
  [Brush.generator]: [
    { item: Item.ironPlate, count: 20 },
    { item: Item.wire, count: 10 },
  ] as BuildCost,
  [Brush.miner]: [
    { item: Item.ironPlate, count: 10 },
    { item: Item.wire, count: 5 },
  ] as BuildCost,
  [Brush.pole]: [
    { item: Item.ironRod, count: 5 },
    { item: Item.wire, count: 5 },
  ] as BuildCost,
  [Brush.sink]: [
    { item: Item.ironPlate, count: 10 },
    { item: Item.wire, count: 20 },
  ] as BuildCost,
  [Brush.smelter]: [
    { item: Item.ironRod, count: 5 },
    { item: Item.wire, count: 10 },
  ] as BuildCost,
  [Brush.storage]: [
    { item: Item.ironPlate, count: 10 },
    { item: Item.ironRod, count: 10 },
  ] as BuildCost,
  [Brush.wire]: [
    { item: Item.wire, count: 1 },
  ] as BuildCost,
};

export const Mining: Partial<Record<Item, { consumption: number; count: number; rate: number; }>> = {
  [Item.copperOre]: { consumption: 100, count: 20, rate: 20 },
  [Item.ironOre]: { consumption: 100, count: 20, rate: 20 },
};

export const Sinking: Partial<Record<Item, number>> = {
  [Item.computer]: 64,
  [Item.copperIngot]: 2,
  [Item.frame]: 32,
  [Item.ironIngot]: 2,
  [Item.ironPlate]: 6,
  [Item.ironRod]: 4,
  [Item.rotor]: 32,
  [Item.wire]: 4,
};

export enum Transformer {
  aggregator,
  combinator,
  fabricator,
  smelter,
}

export const TransformerName = {
  [Transformer.aggregator]: 'Aggregator',
  [Transformer.combinator]: 'Combinator',
  [Transformer.fabricator]: 'Fabricator',
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
];
