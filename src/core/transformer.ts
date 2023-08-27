import {
  PositionalAudio,
  Vector3,
} from 'three';
import { Connectors, PoweredContainer } from './container';
import Instances from './instances';
import SFX from './sfx';
import { Item, Recipe, Recipes } from '../objects/items';

class Transformer extends PoweredContainer<
  {
    type: 'recipe';
    data: Recipe;
  }
> {
  private readonly counts: { input: Partial<Record<Item, number>>, output: number };
  private recipe?: Recipe;
  private readonly sfx: SFX;
  private sound?: PositionalAudio;
  private tick: number;

  constructor(parent: Instances<Transformer>, connectors: Connectors, position: Vector3, rotation: number, consumption: number, sfx: SFX) {
    super(parent, connectors, position, rotation, consumption);
    this.counts = { input: {}, output: 0 };
    this.sfx = sfx;
    this.tick = 0;
  }
  
  getRecipe() {
    return this.recipe;
  }

  setRecipe(recipe: Recipe) {
    this.counts.input = recipe.input.reduce<Transformer["counts"]["input"]>((counts, { item }) => {
      counts[item] = 0;
      return counts;
    }, {}),
    this.counts.output = 0;
    this.recipe = recipe;
    this.tick = 0;
    this.dispatchEvent({ type: 'recipe', data: recipe });
  }

  override dispose() {
    if (this.sound?.isPlaying) {
      this.sound.stop();
    }
  }

  override canInput(item: Item) {
    const { counts, enabled, recipe } = this;
    return enabled && !!recipe?.input.find((input) => input.item === item && counts.input[item]! < input.count);
  }

  override input(item: Item) {
    const { counts } = this;
    counts.input[item]!++;
  }

  override output() {
    const { counts, recipe } = this;
    if (counts.output > 0 && recipe) {
      counts.output--;
      return recipe.output.item;
    }
    return Item.none;
  }

  process() {
    const { counts, enabled, position, powered, recipe, sfx } = this;
    if (
      !enabled
      || !powered
      || !recipe
      || !!recipe.input.find(({ item, count }) => counts.input[item]! < count)
      || ++this.tick < recipe.rate
    ) {
      return false;
    }
    this.tick = 0;
    if (!this.sound?.isPlaying) {
      this.sound = sfx.playAt('machine', position, Math.random() * 0.1, (Math.random() - 0.5) * 1200);
    }
    recipe.input.forEach(({ item, count }) => {
      counts.input[item]! -= count;
    });
    counts.output += recipe.output.count;
    return true;
  }

  override serialize() {
    const { recipe } = this;
    return [
      ...super.serialize(),
      ...(recipe ? [Recipes.indexOf(recipe)] : []),
    ];
  }
}

export default Transformer;
