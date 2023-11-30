<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Item, ItemName, Researching } from '../../core/data';
  import Dialog from '../components/dialog.svelte';
  import Grid from '../components/grid.svelte';
  import Heading from '../components/heading.svelte';
  import Modules from '../components/modules.svelte';
  import Module from '../components/module.svelte';
  import Achievements, { Achievement } from '../stores/achievements';
  import Inventory from '../stores/inventory';
  import Research from '../stores/research';
  import Settings from '../stores/settings';

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

  const achievements = Object.keys(Achievement)
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

  let lastScreenshotURL: string;
  const takeScreenshot = () => (
    Settings.takeScreenshot(3840, 2160)
      .then((blob) => {
        const downloader = document.createElement('a');
        downloader.download = 'screenshot.png';
        URL.revokeObjectURL(lastScreenshotURL);
        downloader.href = lastScreenshotURL = URL.createObjectURL(blob);
        downloader.click();
      })
      .catch(() => {})
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
        <div class="buttons">
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
        <div class="buttons">
          <button on:click={takeScreenshot}>
            Download 4K Screenshot
          </button>
          <button class="toggle" on:click={toggleControlsMode}>
            Toggle debug Controls
            <span class="info">
              WASD: move, SPACEBAR/SHIFT: up/down, Wheel: velocity
            </span>
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
  .buttons {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .toggle {
    height: 4rem;
    flex-direction: column;
    white-space: normal;
  }
  .info {
    display: block;
    color: #aaa;
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
