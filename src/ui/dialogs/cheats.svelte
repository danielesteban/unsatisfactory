<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Item, ItemName, Researching } from '../../core/data';
  import Dialog from '../components/dialog.svelte';
  import Grid from '../components/grid.svelte';
  import Heading from '../components/heading.svelte';
  import Modules from '../components/modules.svelte';
  import Module from '../components/module.svelte';
  import Settings from '../stores/settings';
  import Achievements, { Achievement } from '../stores/achievements';
  import Inventory from '../stores/inventory';
  import Research from '../stores/research';

  export let close: () => void;

  const items = Object.keys(Item)
    .filter((key) => !isNaN(parseInt(key, 10)) && key !== '0')
    .map((key) => parseInt(key, 10) as Item)
    .sort((a, b) => ItemName[a].localeCompare(ItemName[b]));

  let hasGivenItem = false;
  let hasGivenItemTimer = 0;
  const giveItem = (e: SubmitEvent) => {
    e.preventDefault();
    Inventory.input(
      parseInt((e.target as any).item.value, 10) as Item,
      parseInt((e.target as any).amount.value, 10)
    );
    hasGivenItem = true;
    clearTimeout(hasGivenItemTimer);
    hasGivenItemTimer = setTimeout(() => {
      hasGivenItem = false;
    }, 1000);
  };

  onDestroy(() => {
    clearTimeout(hasGivenItemTimer);
  });

  const achievements = Object.keys(Achievements)
    .filter((key) => !isNaN(parseInt(key, 10)))
    .map((key) => parseInt(key, 10) as Achievement);

  const completeAchievements = () => (
    achievements.forEach((achievement) => (
      Achievements.complete(achievement)
    ))
  );

  const completeResearch = () => (
    Researching.forEach((_v, research) => Research.complete(research))
  );

  const toggleControlsMode = () => {
    Settings.toggleControlsMode();
    close();
  };
</script>

<Dialog close={close}>
  <Heading>
    Cheats
  </Heading>
  <Grid>
    <Modules>
      <Module>
        <div slot="name">Progression</div>
        <div class="cheats">
          <button on:click={completeAchievements}>
            Complete all Achievements
          </button>
          <button on:click={completeResearch}>
            Complete all Research
          </button>
        </div>
      </Module>
      <Module>
        <div slot="name">Debug</div>
        <div class="cheats">
          <button on:click={toggleControlsMode}>
            Toggle debug controls
          </button>
        </div>
      </Module>
    </Modules>
    <Modules>
      <Module>
        <div slot="name">Items</div>
        <form on:submit={giveItem}>
          <select name="item">
            {#each items as item}
              <option value={item}>
                {ItemName[item]}
              </option>
            {/each}
          </select>
          <input name="amount" type="number" step="1" min="1" value="1" />
          <button type="submit">
            {hasGivenItem ? 'Given!' : 'Give items'}
          </button>
        </form>
      </Module>
    </Modules>
  </Grid>
</Dialog>

<style>
  .cheats {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  form {
    display: flex;
    gap: 0.5rem;
  }
  form > input, form > select {
    flex-grow: 1;
    width: auto;
  }
  form > button {
    width: 4rem;
  }
</style>
