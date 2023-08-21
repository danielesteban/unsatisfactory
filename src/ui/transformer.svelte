<script lang="ts">
  import { onDestroy } from 'svelte';
  import Dialog from './components/dialog.svelte';
  import Grid from './components/grid.svelte';
  import Heading from './components/heading.svelte';
  import Modules from './components/modules.svelte';
  import Module from './components/module.svelte';
  import Power from './modules/power.svelte';
  import Production from './modules/production.svelte';
  import Toggle from './modules/toggle.svelte';
  import { ItemName, Recipes, Recipe, Transformer as ItemTrasformer } from '../objects/items';
  import Transformer from '../core/transformer';

  export let close: () => void;
  export let transformer: ItemTrasformer;
  export let instance: Transformer;

  const name = {
    [ItemTrasformer.fabricator]: 'Fabricator',
    [ItemTrasformer.smelter]: 'Smelter',
  }[transformer];
  const recipes = Recipes.filter((recipe) => recipe.transformer === transformer);

  const setRecipe = ({ target: { value } }: any) => {
    instance.setRecipe(recipes[+value]);
  };

  let recipe = instance.getRecipe();
  let recipeIndex = recipes.indexOf(recipe);
  const onRecipe = ({ data }: { data: Recipe }) => {
    recipe = data;
    recipeIndex = recipes.indexOf(recipe);
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
        <div>
          <select
            on:change={setRecipe}
            value={recipeIndex}
          >
            {#each recipes as recipe, index}
              <option value={index}>
                {ItemName[recipe.input.item]}
                ⇾
                {ItemName[recipe.output.item]}
              </option>
            {/each}
          </select>
        </div>
      </Module>
      <Production
        name="Input"
        item={recipe.input.item}
        rate={recipe.rate}
        count={recipe.input.count}
      />
      <Production
        name="Output"
        item={recipe.output.item}
        rate={recipe.rate}
        count={recipe.output.count}
      />
    </Modules>
  </Grid>
</Dialog>
