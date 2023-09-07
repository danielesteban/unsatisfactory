
<script lang="ts">
  import { Item, ItemName, Recipes, TransformerName } from '../../core/data';
  import Simulation from '../../core/simulation';
  import Module from '../components/module.svelte';
  import ItemImage from '../components/item.svelte';
  
  export let item: Exclude<Item, Item.none>;

  $: recipes = Recipes.filter(({ output: { item: output } }) => output === item);
</script>

<Module>
  <div slot="name">{ItemName[item]}</div>
  <div class="info">
    <div class="image">
      <ItemImage item={item} />
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
</Module>

<style>
  .info {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 1rem;
  }
  .image {
    width: 10rem;
    height: 10rem;
    background: rgba(0, 0, 0, .2);
    border-radius: 0.5rem;
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
