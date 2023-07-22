<script lang="ts">
  import { onDestroy } from 'svelte';
  import Dialog from './components/dialog.svelte';
  import Heading from './components/heading.svelte';
  import Modules from './components/modules.svelte';
  import Module from './components/module.svelte';
  import Power from './modules/power.svelte';
  import Toggle from './modules/toggle.svelte';
  import { Item, Recipes } from '../objects/items';
  import { Fabricator } from '../objects/fabricators';

  export let close: () => void;
  export let instance: Fabricator;
  
  const items = {
    [Item.none]: 'None',
    [Item.box]: 'Box',
    [Item.capsule]: 'Capsule',
    [Item.cylinder]: 'Cylinder',
    [Item.ore]: 'Ore',
  };

  const setRecipe = ({ target: { value } }: any) => {
    instance.setRecipe(Recipes[+value]);
  };

  let recipe = Recipes.indexOf(instance.getRecipe());
  const onRecipe = ({ data }: any) => {
    recipe = Recipes.indexOf(data);
  };
  // @ts-ignore
  instance.addEventListener('recipe', onRecipe);
  onDestroy(() => (
    // @ts-ignore
    instance.removeEventListener('recipe', onRecipe)
  ));
</script>

<Dialog close={close}>
  <Heading>Fabricator</Heading>
  <Modules>
    <Toggle instance={instance} />
    <Module>
      <div slot="name">Production</div>
      <div>
        <select
          on:change={setRecipe}
          value={recipe}
        >
          {#each Recipes as recipe, index}
            <option value={index}>
              {items[recipe.input.item]}
              -&gt;
              {items[recipe.output.item]}
            </option>
          {/each}
        </select>
      </div>
    </Module>
    <Power instance={instance} />
  </Modules>
</Dialog>
