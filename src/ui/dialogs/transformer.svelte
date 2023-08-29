<script lang="ts" context="module">
  import { tap } from '../../sounds';
  const sfx = new Audio(tap);
  sfx.volume = 0.2;
</script>

<script lang="ts">
  import { onDestroy } from 'svelte';
  import Transformer from '../../core/transformer';
  import { ItemName, Recipes, Recipe, Transformer as ItemTrasformer } from '../../objects/items';
  import Dialog from '../components/dialog.svelte';
  import Grid from '../components/grid.svelte';
  import Heading from '../components/heading.svelte';
  import Modules from '../components/modules.svelte';
  import Module from '../components/module.svelte';
  import Power from '../modules/power.svelte';
  import Production from '../modules/production.svelte';
  import Toggle from '../modules/toggle.svelte';
  import { captureItem } from '../capture';

  export let close: () => void;
  export let transformer: ItemTrasformer;
  export let instance: Transformer;

  const name = {
    [ItemTrasformer.aggregator]: 'Aggregator',
    [ItemTrasformer.combinator]: 'Combinator',
    [ItemTrasformer.fabricator]: 'Fabricator',
    [ItemTrasformer.smelter]: 'Smelter',
  }[transformer];
  const recipes = Recipes.filter((recipe) => recipe.transformer === transformer);

  const setRecipe = (recipe: Recipe) => () => {
    instance.setRecipe(recipe);
    !localStorage.getItem('sfx:muted') && sfx.paused && sfx.play();
  };

  let recipe = instance.getRecipe();
  const onRecipe = ({ data }: { data: Recipe }) => {
    recipe = data;
  };
  instance.addEventListener('recipe', onRecipe);
  onDestroy(() => (
    instance.removeEventListener('recipe', onRecipe)
  ));
</script>

<Dialog close={close}>
  <Heading>{name}</Heading>
  <Grid>
    <Modules>
      <Toggle instance={instance} />
      <Power instance={instance} />
    </Modules>
    <Modules>
      <Module>
        <div slot="name">Production</div>
        <div class="recipes">
          {#each recipes as r}
            <button
              class="recipe"
              class:selected={r === recipe}
              on:click={setRecipe(r)}
            >
              {#await captureItem(r.output.item) then images}
                {#each images as image}
                  <!-- svelte-ignore a11y-missing-attribute -->
                  <img src={image} />
                {/each}
              {/await}
              <span>{ItemName[r.output.item]}</span>
            </button>
          {/each}
        </div>
      </Module>
      {#if recipe}
        <Production
          name="Input"
          items={recipe.input}
          rate={recipe.rate}
        />
        <Production
          name="Output"
          items={recipe.output}
          rate={recipe.rate}
        />
      {/if}
    </Modules>
  </Grid>
</Dialog>

<style>
  .recipes {
    display: flex;
    gap: 0.25rem;
  }
  .recipe {
    position: relative;
    width: 5rem;
    height: 5rem;
    background: rgba(0, 0, 0, .2);
    border: 2px solid transparent;
    border-radius: 0.5rem;
  }
  .recipe.selected {
    border-color: rgba(90, 255, 90, 0.5);
  }
  .recipe > img {
    position: absolute;
    width: 3.5rem;
    height: 3.5rem;
    top: 0.625rem;
    left: 0.625rem;
    pointer-events: none;
  }
  .recipe > img:nth-child(2) {
    display: none;
  }
  .recipe:hover > img:nth-child(1), .recipe.selected > img:nth-child(1) {
    display: none;
  }
  .recipe:hover > img:nth-child(2), .recipe.selected > img:nth-child(2) {
    display: block;
  }
  .recipe > span {
    position: absolute;
    left: 0;
    bottom: 0.25rem;
    width: 100%;
    display: block;
    text-align: center;
    color: #999;
    white-space: nowrap;
  }
  .recipe:hover > span, .recipe.selected > span {
    color: #eee;
  }
</style>
