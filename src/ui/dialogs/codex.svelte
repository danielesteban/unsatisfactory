<script context="module" lang="ts">
  import { writable } from 'svelte/store';
  import { Item, ItemName } from '../../objects/items';
  import { captureItem } from '../capture';

  const items = Object.keys(ItemName)
    .map((item) => parseInt(item, 10) as Item)
    .filter((item) => item !== Item.none)
    .sort((a, b) => ItemName[a].localeCompare(ItemName[b])) as Exclude<Item, Item.none>[];

  const selected = writable<Exclude<Item, Item.none>>(items[0]);
  const select = (item: Exclude<Item, Item.none>) => () => (
    selected.set(item)
  );
</script>

<script lang="ts">
  import Simulation from '../../core/simulation';
  import { Recipes, TransformerName } from '../../objects/items';
  import Dialog from '../components/dialog.svelte';
  import Heading from '../components/heading.svelte';

  export let close: () => void;

  $: recipes = Recipes
    .filter(({ output: { item } }) => item === $selected);
</script>

<Dialog close={close}>
  <Heading>Codex</Heading>
  <div class="grid">
    <div class="items">
      {#each items as item}
        <button class:selected={$selected === item} on:click={select(item)}>
          {ItemName[item]}
        </button>
      {/each}
    </div>
    <div class="codex">
      <div class="heading">
        {ItemName[$selected]}
      </div>
      <div class="info">
        <div class="image">
          {#await captureItem($selected) then images}
            <!-- svelte-ignore a11y-missing-attribute -->
            <img src={images[1]} />
          {/await}
        </div>
        <div class="recipes">
          {#each recipes as recipe}
            <div class="recipe">
              <div class="transformer">
                {TransformerName[recipe.transformer]}
              </div>
              <div class="io">
                <div>
                  {#each recipe.input as input}
                    <div class="item">
                      <div><span class="count">{input.count}</span> {ItemName[input.item]}</div>
                      <div class="rate">{60 * (Simulation.tps / recipe.rate) * input.count} / min</div>
                    </div>
                  {/each}
                </div>
                <div class="item">
                  <div><span class="count">{recipe.output.count}</span> {ItemName[recipe.output.item]}</div>
                  <div class="rate">{60 * (Simulation.tps / recipe.rate) * recipe.output.count} / min</div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
</Dialog>

<style>
  .grid {
    display: grid;
    grid-template-columns: auto 1fr;
  }
  .items {
    box-sizing: border-box;
    width: 128px;
    height: 420px;
    padding: 1rem;
    background: rgba(0, 0, 0, .2);
    border-radius: 0 0 0 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    overflow-y: overlay;
  }
  .items > button {
    flex-shrink: 0;
  }
  .items > button.selected {
    background: rgba(90, 255, 90, 0.5);
  }
  .codex {
    display: grid;
    grid-template-rows: auto 1fr;
    gap: 1rem;
    padding: 1rem;
  }
  .info {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 2rem;
  }
  .heading {
    font-size: 1.125rem;
    line-height: 1em;
  }
  .image {
    width: 10rem;
    height: 10rem;
    background: rgba(0, 0, 0, .2);
    border-radius: 0.5rem;
  }
  .image > img {
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
  .recipes {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .recipe {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .io {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .transformer {
    font-size: 1rem;
    line-height: 1em;
    color: #aaa;
  }
  .item {
    display: flex;
    justify-content: space-between;
  }
  .count {
    font-weight: 600;
  }
  .rate {
    color: #aaa;
    font-size: 0.6875rem;
  }
</style>
