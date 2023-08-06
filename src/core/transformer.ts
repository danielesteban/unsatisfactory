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
  private readonly outputItems: Item[];
  private recipe: Recipe;
  private readonly sfx: SFX;
  private sound?: PositionalAudio;
  private tick: number;

  constructor(position: Vector3, rotation: number, recipe: Recipe, sfx: SFX) {
    super(position, rotation, 0, 10);
    this.outputItems = [];
    this.recipe = recipe;
    this.sfx = sfx;
    this.tick = 0;
  }

  getRecipe() {
    return this.recipe;
  }

  setRecipe(recipe: Recipe) {
    this.items.length = 0;
    this.recipe = recipe;
    this.dispatchEvent({ type: 'recipe', data: recipe });
  }

  override dispose() {
    if (this.sound?.isPlaying) {
      this.sound.stop();
    }
  }

  override canInput(item: Item) {
    const { enabled, items, recipe } = this;
    return !!(
      enabled
      && recipe.input.item === item
      && items.length < recipe.input.count
    );
  }

  override getOutput() {
    const { items, recipe, outputItems, position, tick, sfx } = this;
    if (outputItems.length) {
      return outputItems.pop()!;
    }
    if (tick < recipe.rate) {
      return Item.none;
    }
    this.tick = 0;
    if (!this.sound?.isPlaying) {
      this.sound = sfx.playAt('machine', position, Math.random() * 0.1, (Math.random() - 0.5) * 1200);
    }
    items.length = 0;
    for (let i = 0; i < recipe.output.count; i++) {
      outputItems.unshift(recipe.output.item);
    }
    return outputItems.pop()!;
  }

  override output(belt: Belt) {
    const { enabled, items, powered, recipe } = this;
    if (
      enabled
      && powered
      && items.length >= recipe.input.count
    ) {
      this.tick++;
    }
    return super.output(belt);
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
