<script lang="ts" context="module">
  import { tap } from '../../sounds';
  const sfx = new Audio(tap);
  sfx.volume = 0.2;
</script>

<script lang="ts">
  import { onDestroy } from 'svelte';
  import { writable } from 'svelte/store';
  import { Item, ItemName, Recipes, Recipe, Transformer as ItemTrasformer, TransformerName } from '../../core/data';
  import Transformer from '../../core/transformer';
  import DialogWithInventory from '../components/dialoginventory.svelte';
  import Grid from '../components/grid.svelte';
  import { Hand } from '../components/hand.svelte';
  import Heading from '../components/heading.svelte';
  import ItemImage from '../components/item.svelte';
  import Modules from '../components/modules.svelte';
  import Module from '../components/module.svelte';
  import Power from '../modules/power.svelte';
  import Production from '../modules/production.svelte';
  import Progress from '../modules/progress.svelte';
  import Toggle from '../modules/toggle.svelte';
  import Inventory from '../stores/inventory';
  import Settings from '../stores/settings';

  export let close: () => void;
  export let instance: Transformer;
  export let transformer: ItemTrasformer;

  const name = TransformerName[transformer];
  const recipes = Recipes.filter((recipe) => recipe.transformer === transformer);

  const setRecipe = (recipe: Recipe) => () => {
    instance.setRecipe(recipe);
    $Settings.sfx && sfx.paused && sfx.play();
  };

  const resetRecipe = () => {
    const recipe = instance.getRecipe();
    if (recipe) {
      const inputBuffer = instance.getInputBuffer();
      const outputBuffer = instance.getOutputBuffer();
      recipe.input.forEach(({ item }) => inputBuffer[item] && Inventory.input(item, inputBuffer[item]!));
      if (outputBuffer > 0) {
        Inventory.input(recipe.output.item, outputBuffer);
      }
    }
    instance.setRecipe(undefined);
    $Settings.sfx && sfx.paused && sfx.play();
  };

  const hand: Hand = writable(undefined);
  const onInput = (item: Exclude<Item, Item.none>) => ({ button, isPrimary, shiftKey }: PointerEvent) => {
    if (!isPrimary) {
      return;
    }
    if ($hand) {
      const { item, count, slot: from } = $hand;
      const amount = button === 2 ? 1 : count;
      let remaining = count - amount;
      remaining += instance.addToInputBuffer(item, amount);
      $hand = remaining > 0 ? { item, count: remaining, slot: from } : undefined;
      return;
    }
    const count = instance.getInputBuffer()[item]!;
    if (!count) {
      return;
    }
    const amount = button === 2 ? Math.ceil(count / 2) : count;
    if (shiftKey) {
      Inventory.input(item, instance.getFromInputBuffer(item, amount));
    } else {
      $hand = { item, count: instance.getFromInputBuffer(item, amount), slot: 0 };
    }
  };
  const onOutput = (item: Exclude<Item, Item.none>) => ({ button, isPrimary, shiftKey }: PointerEvent) => {
    if (!isPrimary || $hand) {
      return;
    }
    const count = instance.getOutputBuffer();
    if (!count) {
      return;
    }
    const amount = button === 2 ? Math.ceil(count / 2) : count;
    if (shiftKey) {
      Inventory.input(item, instance.getFromOutputBuffer(amount));
    } else {
      $hand = { item, count: instance.getFromOutputBuffer(amount), slot: 0 };
    }
  };
  const onPush = (slot: number, count: number) => {
    const { item } = Inventory.getSlot(slot);
    const remaining = instance.addToInputBuffer(item, count);
    Inventory.getFromSlot(slot, count - remaining);
  };

  let recipe = instance.getRecipe();
  let inputBuffer = instance.getInputBuffer();
  let outputBuffer = instance.getOutputBuffer();
  const onInputBuffer = () => {
    inputBuffer = instance.getInputBuffer();
  };
  const onOutputBuffer = () => {
    outputBuffer = instance.getOutputBuffer();
  };
  const onRecipe = () => {
    recipe = instance.getRecipe();
  };
  instance.addEventListener('input', onInputBuffer);
  instance.addEventListener('output', onOutputBuffer);
  instance.addEventListener('recipe', onRecipe);
  onDestroy(() => {
    instance.removeEventListener('input', onInputBuffer);
    instance.removeEventListener('output', onOutputBuffer);
    instance.removeEventListener('recipe', onRecipe);
  });

  $: input = recipe ? recipe.input.map((input) => ({ ...input, buffer: inputBuffer[input.item]! })) : [];
  $: output = recipe ? { ...recipe?.output, buffer: outputBuffer } : [];
</script>

<DialogWithInventory close={close} hand={hand} onPush={onPush}>
  <Heading>
    {name}
    <div slot="actions">
      {#if recipe}
        <button
          class="select"
          on:click={resetRecipe}
        >
          Recipe
        </button>
      {/if}
    </div>
  </Heading>
  {#if !recipe}
    <Modules>
      <Module>
        <div slot="name">Recipe</div>
        <div class="recipes">
          {#each recipes as r}
            <button
              class="recipe"
              on:click={setRecipe(r)}
            >
              <ItemImage item={r.output.item} multiple let:images>
                {#each images as image}
                  <!-- svelte-ignore a11y-missing-attribute -->
                  <img src={image} />
                {/each}
              </ItemImage>
              <span>{ItemName[r.output.item]}</span>
            </button>
          {/each}
        </div>
      </Module>
    </Modules>
  {:else}
    <Grid>
      <Modules>
        <Toggle instance={instance} />
        <Progress instance={instance} />
        <Power instance={instance} />
      </Modules>
      <Modules>
        <Production
          name="Input"
          items={input}
          rate={recipe.rate}
          onBuffer={onInput}
        />
        <Production
          name="Output"
          items={output}
          rate={recipe.rate}
          onBuffer={onOutput}
        />
      </Modules>
    </Grid>
  {/if}
</DialogWithInventory>

<style>
  .select {
    background: rgba(0, 0, 0, .2);
    height: 1.375rem;
    font-size: 0.75rem;
  }
  .recipes {
    display: flex;
    gap: 0.25rem;
  }
  .recipe {
    position: relative;
    width: 5rem;
    height: 5rem;
    background: rgba(0, 0, 0, .2);
    border-radius: 0.5rem;
  }
  .recipe > img {
    position: absolute;
    width: 3.5rem;
    height: 3.5rem;
    top: 0.75rem;
    left: 0.75rem;
    pointer-events: none;
  }
  .recipe > img:nth-child(2) {
    display: none;
  }
  .recipe:hover > img:nth-child(1) {
    display: none;
  }
  .recipe:hover > img:nth-child(2) {
    display: block;
  }
  .recipe > span {
    position: absolute;
    left: 0;
    bottom: 0.25rem;
    width: 100%;
    display: block;
    text-align: center;
    color: #aaa;
    white-space: nowrap;
  }
  .recipe:hover > span {
    color: #eee;
  }
</style>
