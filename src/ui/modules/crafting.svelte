<script lang="ts">
  import { onDestroy } from 'svelte';
  import { derived } from 'svelte/store';
  import { ItemName, Recipes, Recipe, Transformer as ItemTrasformer } from '../../core/data';
  import ItemImage from '../components/item.svelte';
  import Inventory from '../stores/inventory';

  let crafting: Recipe | undefined;
  let step: number = 0;
  let timer: number = 0;
  const craft = (recipe: Recipe) => () => {
    crafting = recipe;
    step = 0.1;
    clearInterval(timer);
    timer = setInterval(() => {
      if (step < 1) {
        step += 0.3;
        return;
      }
      crafting = undefined;
      clearInterval(timer);
      recipe.input.forEach(({ item, count }) => Inventory.output(item, count));
      Inventory.input(recipe.output.item, recipe.output.count);    
    }, 500);
  };
  onDestroy(() => clearInterval(timer));

  const recipes = derived([Inventory], ([_]) => (
    Recipes
      .filter((recipe) => (
        recipe.transformer === ItemTrasformer.fabricator
      ))
      .map((recipe) => ({
        ...recipe,
        canCraft: !recipe.input.find(({ item, count }) => (!Inventory.canOutput(item, count))),
      }))
  ));
</script>

<div class="recipes">
  {#each $recipes as recipe}
    <button
      class="recipe"
      class:crafting={crafting === recipe}
      disabled={!recipe.canCraft}
      on:click={craft(recipe)}
    >
      <span class="progress">
        {#if crafting === recipe}
          <span style="width: {Math.round(step * 100)}%" />
        {/if}
      </span>
      <span class="image">
        <ItemImage item={recipe.output.item} multiple let:images>
          {#each images as image}
            <!-- svelte-ignore a11y-missing-attribute -->
            <img src={image} />
          {/each}
        </ItemImage>
      </span>
      <span class="name">{ItemName[recipe.output.item]}</span>
    </button>
  {/each}
</div>

<style>
  .recipes {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .recipe {
    position: relative;
    display: flex;
    align-items: center;
    background: rgba(0, 0, 0, .2);
    height: 3.5rem;
    padding-right: 3.5rem;
  }
  .recipe.crafting {
    cursor: default;
  }
  .progress {
    display: block;
    position: absolute;
    bottom: 0.5rem;
    left: 0.5rem;
    right: 0.5rem;
    height: 0.25rem;
  }
  .progress > span {
    display: block;
    background: rgba(90, 255, 90, 0.5);
    height: 100%;
    border-radius: 0.125rem;
  }
  .image {
    position: relative;
    display: block;
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 0.5rem;
  }
  .image > img {
    position: absolute;
    display: block;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    pointer-events: none;
  }
  .image > img:nth-child(2) {
    display: none;
  }
  .recipe.crafting .image > img:nth-child(1), .recipe:hover .image > img:nth-child(1) {
    display: none;
  }
  .recipe.crafting .image > img:nth-child(2), .recipe:hover .image > img:nth-child(2) {
    display: block;
  }
  .recipe:disabled:hover .image > img:nth-child(1) {
    display: block;
  }
  .recipe:disabled:hover .image > img:nth-child(2) {
    display: none;
  }
  .name {
    flex-grow: 1;
    display: block;
    text-align: center;
    color: #aaa;
    white-space: nowrap;
  }
  .recipe.crafting .name, .recipe:hover .name {
    color: #eee;
  }
  .recipe:disabled:hover .name {
    color: #aaa;
  }
</style>
