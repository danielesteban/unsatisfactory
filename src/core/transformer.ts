import {
  PositionalAudio,
  Vector3,
} from 'three';
import { PoweredContainer } from './container';
import SFX from './sfx';
import { Belt } from '../objects/belts';
import { Item, Recipe, Recipes } from '../objects/items';

class Transformer extends PoweredContainer<
  {
    type: 'recipe';
    data: Recipe;
  }
> {
  private readonly counts: { input: 0, output: 0 };
  private recipe: Recipe;
  private readonly sfx: SFX;
  private sound?: PositionalAudio;
  private tick: number;

  constructor(position: Vector3, rotation: number, recipe: Recipe, sfx: SFX) {
    super(position, rotation, 0, 10);
    this.counts = { input: 0, output: 0 };
    this.recipe = recipe;
    this.sfx = sfx;
    this.tick = 0;
  }

  override dispose() {
    if (this.sound?.isPlaying) {
      this.sound.stop();
    }
  }

  override canInput(item: Item) {
    const { counts, enabled, recipe } = this;
    return enabled && item === recipe.input.item && counts.input < recipe.input.count;
  }

  override input() {
    const { counts } = this;
    counts.input++;
  }

  override getOutput() {
    const { counts, recipe } = this;
    if (counts.output > 0) {
      counts.output--;
      return recipe.output.item;
    }
    return Item.none;
  }

  override output(belt: Belt) {
    this.process();
    return super.output(belt);
  }

  private process() {
    const { counts, enabled, position, powered, recipe, sfx } = this;
    if (
      !enabled
      || !powered
      || counts.input < recipe.input.count
      || ++this.tick < recipe.rate
    ) {
      return;
    }
    this.tick = 0;
    if (!this.sound?.isPlaying) {
      this.sound = sfx.playAt('machine', position, Math.random() * 0.1, (Math.random() - 0.5) * 1200);
    }
    counts.input -= recipe.input.count;
    counts.output += recipe.output.count;
  }

  getRecipe() {
    return this.recipe;
  }

  setRecipe(recipe: Recipe) {
    this.counts.input = 0;
    this.counts.output = 0;
    this.recipe = recipe;
    this.tick = 0;
    this.dispatchEvent({ type: 'recipe', data: recipe });
  }

  override serialize() {
    const { recipe } = this;
    return [
      ...super.serialize(),
      Recipes.indexOf(recipe),
    ];
  }
}

export default Transformer;
