import {
  PositionalAudio,
  Vector3,
} from 'three';
import { Connectors, PoweredContainer } from './container';
import { Item, Recipe, Recipes } from './data';
import SFX from './sfx';
import Inventory from '../ui/stores/inventory';

class Transformer extends PoweredContainer<
  { type: 'input'; }
  | { type: 'output'; }
  | { type: 'progress'; }
  |  { type: 'recipe'; }
> {
  private static readonly inputEvent: { type: 'input' } = { type: 'input' };
  private static readonly outputEvent: { type: 'output' } = { type: 'output' };
  private static readonly progressEvent: { type: 'progress' } = { type: 'progress' };
  private static readonly recipeEvent: { type: 'recipe' } = { type: 'recipe' };
  
  private static readonly maxInputBuffer: number = 100;
  private static readonly maxOutputBuffer: number = 100;
  private readonly buffer: { input: Partial<Record<Item, number>>, output: number };
  private recipe?: Recipe;
  private readonly sfx: SFX;
  private sound?: PositionalAudio;
  private tick: number;

  constructor(connectors: Connectors, position: Vector3, rotation: number, consumption: number, sfx: SFX) {
    super(connectors, position, rotation, consumption);
    this.buffer = { input: {}, output: 0 };
    this.sfx = sfx;
    this.tick = 0;
  }

  getInputBuffer() {
    return this.buffer.input;
  }

  getFromInputBuffer(item: Item, count: number) {
    const c = Math.min(count, this.buffer.input[item]!);
    this.buffer.input[item]! -= c;
    this.dispatchEvent(Transformer.inputEvent);
    return c;
  }

  addToInputBuffer(item: Item, count: number) {
    if (this.buffer.input[item] === undefined) {
      return count;
    }
    const c = Math.min(count, Transformer.maxInputBuffer - this.buffer.input[item]!);
    this.buffer.input[item]! += c;
    this.dispatchEvent(Transformer.inputEvent);
    return count - c;
  }

  getOutputBuffer() {
    return this.buffer.output;
  }
  
  getFromOutputBuffer(count: number) {
    const c = Math.min(count, this.buffer.output);
    this.buffer.output -= c;
    this.dispatchEvent(Transformer.outputEvent);
    return c;
  }

  getProgress() {
    const { recipe, tick } = this;
    return recipe ? tick / (recipe.rate - 1) : 0;
  }

  getRecipe() {
    return this.recipe;
  }

  setRecipe(recipe: Recipe | undefined) {
    this.buffer.input = recipe?.input.reduce<Transformer["buffer"]["input"]>((buffer, { item }) => {
      buffer[item] = 0;
      return buffer;
    }, {}) || {};
    this.buffer.output = 0;
    this.recipe = recipe;
    this.tick = 0;
    this.dispatchEvent(Transformer.recipeEvent);
    this.dispatchEvent(Transformer.inputEvent);
    this.dispatchEvent(Transformer.outputEvent);
    this.dispatchEvent(Transformer.progressEvent);
  }

  override dispose() {
    const { buffer, recipe, sound } = this;
    if (recipe) {
      recipe.input.forEach(({ item }) => {
        const count = buffer.input[item]!;
        if (count > 0) {
          Inventory.input(item, count);
        }
      });
      if (buffer.output > 0) {
        Inventory.input(recipe.output.item, buffer.output);
      }
    }
    if (sound) {
      sound.stop();
    }
  }

  override acceptsInput(item: Item) {
    const { buffer, enabled, recipe } = this;
    return enabled && !!recipe?.input.find((input) => input.item === item && buffer.input[item]! < input.count);
  }

  override canInput() {
    const { buffer, enabled, recipe } = this;
    return (
      enabled && !!recipe?.input.find(({ item, count }) => buffer.input[item]! < count)
    );
  }

  override input(item: Item) {
    const { buffer } = this;
    buffer.input[item]!++;
    this.dispatchEvent(Transformer.inputEvent);
  }

  override canOutput() {
    const { buffer } = this;
    return buffer.output > 0;
  }

  override output() {
    const { buffer, recipe } = this;
    if (buffer.output > 0 && recipe) {
      buffer.output--;
      this.dispatchEvent(Transformer.outputEvent);
      return recipe.output.item;
    }
    return Item.none;
  }

  process() {
    const { buffer, enabled, position, powered, recipe, sfx } = this;
    if (
      !enabled
      || !powered
      || !recipe
      || buffer.output > (Transformer.maxOutputBuffer - recipe.output.count)
    ) {
      return false;
    }
    if (this.tick === 0) {
      if (!!recipe.input.find(({ item, count }) => buffer.input[item]! < count)) {
        return false;
      }
      recipe.input.forEach(({ item, count }) => {
        buffer.input[item]! -= count;
      });
      this.dispatchEvent(Transformer.inputEvent);
    }
    if (++this.tick < recipe.rate) {
      this.dispatchEvent(Transformer.progressEvent);
      return false;
    }
    this.tick = 0;
    buffer.output += recipe.output.count;
    if (!this.sound) {
      this.sound = sfx.playAt(
        'machine',
        position,
        Math.random() * 0.1,
        (Math.random() - 0.5) * 1200,
        0.2,
        () => {
          this.sound = undefined;
        }
      );
    }
    this.dispatchEvent(Transformer.outputEvent);
    this.dispatchEvent(Transformer.progressEvent);
    return true;
  }
  
  setBuffers(serialized: [number[], number]) {
    const { buffer, recipe } = this;
    if (!recipe) {
      return;
    }
    buffer.input = {};
    recipe.input.map(({ item }, i) => {
      buffer.input[item] = serialized[0][i] || 0;
    });
    buffer.output = serialized[1];
  }

  setTick(tick: number) {
    this.tick = tick;
  }

  override serialize() {
    const { buffer, recipe, tick } = this;
    return [
      ...super.serialize(),
      ...(recipe ? [
        Recipes.indexOf(recipe),
        tick,
        [
          recipe.input.map(({ item }) => buffer.input[item]!),
          buffer.output,
        ],
      ] : []),
    ];
  }
}

export default Transformer;
