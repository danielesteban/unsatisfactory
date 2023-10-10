<script lang="ts" context="module">
  import { tap } from '../../sounds';
  const sfx = new Audio(tap);
  sfx.volume = 0.2;
</script>

<script lang="ts">
  import { onDestroy } from 'svelte';
  import { writable } from 'svelte/store';
  import { BrushName, Item, Researching } from '../../core/data';
  import { Lab } from '../../objects/labs';
  import BrushImage from '../components/brush.svelte';
  import DialogWithInventory from '../components/dialoginventory.svelte';
  import Grid from '../components/grid.svelte';
  import { Hand } from '../components/hand.svelte';
  import Heading from '../components/heading.svelte';
  import Modules from '../components/modules.svelte';
  import Module from '../components/module.svelte';
  import Progress from '../components/progress.svelte';
  import Power from '../modules/power.svelte';
  import Production from '../modules/production.svelte';
  import Toggle from '../modules/toggle.svelte';
  import Inventory from '../stores/inventory';
  import Research from '../stores/research';
  import Settings from '../stores/settings';

  export let close: () => void;
  export let instance: Lab;

  const setResearch = (research: typeof Researching[0] | undefined) => () => {
    instance.setResearch(research);
    $Settings.sfx && sfx.paused && sfx.play();
  };

  const resetResearch = () => {
    const research = instance.getResearch();
    if (research) {
      const buffer = instance.getInputBuffer();
      research.input.forEach(({ item }) => buffer[item] && Inventory.input(item, buffer[item]!));
    }
    instance.setResearch(undefined);
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
  const onPush = (slot: number, count: number) => {
    const { item } = Inventory.getSlot(slot);
    const remaining = instance.addToInputBuffer(item, count);
    Inventory.getFromSlot(slot, count - remaining);
  };

  let research = instance.getResearch();
  let buffer = instance.getInputBuffer();
  let progress = instance.getProgress();
  const onBuffer = () => {
    buffer = instance.getInputBuffer();
  };
  const onResearch = () => {
    research = instance.getResearch();
  };
  const onProgress = () => {
    progress = instance.getProgress();
  };
  instance.addEventListener('buffer', onBuffer);
  instance.addEventListener('research', onResearch);
  instance.addEventListener('progress', onProgress);
  onDestroy(() => {
    instance.removeEventListener('buffer', onBuffer);
    instance.removeEventListener('research', onResearch);
    instance.removeEventListener('progress', onProgress);
  });

  $: available = Researching.filter((_v, research) => !$Research.has(research));
  $: input = research ? research.input.map((input) => ({ ...input, buffer: buffer[input.item]! })) : [];
</script>

<DialogWithInventory close={close} hand={hand} onPush={onPush}>
  <Heading>
    Lab
    <div slot="actions">
      {#if research && progress === 0}
        <button
          class="select"
          on:click={resetResearch}
        >
          Research
        </button>
      {/if}
    </div>
  </Heading>
  {#if !research}
    <div class="scroll">
      <Modules>
        {#if available.length}
          <Module>
            <div slot="name">Research</div>
            <div class="researching">
              {#each available as research}
                <button
                  class="research"
                  on:click={setResearch(research)}
                >
                  <span>{research.name}</span>
                  <span class="brushes">
                    {#each research.brushes as brush}
                      <span class="brush">
                        <span class="image">
                          <BrushImage brush={brush} />
                        </span>
                        <span>
                          {BrushName[brush]}
                        </span>
                      </span>
                    {/each}
                  </span>
                </button>
              {/each}
            </div>
          </Module>
        {:else}
          <Module>
            <div>
              Congratulations!
            </div>
            <div>
              You've completed all available research.
            </div>
          </Module>
        {/if}
      </Modules>
    </div>
  {:else}
    <Grid>
      <Modules>
        <Toggle instance={instance} />
        <Power instance={instance} />
      </Modules>
      <Modules>
        <Production
          name="Input"
          items={input}
          onBuffer={onInput}
        />
      </Modules>
    </Grid>
    <div class="submodules">
      <Module>
        <div slot="name">
          Research
        </div>
        <div class="current">
          <div class="name">
            {research.name}
            <div class="percent">{Math.round(progress * 100)}%</div>
          </div>
          <div>
            <Progress value={progress} />
          </div>
          <div class="info">
            {#each research.brushes as brush, i}{#if i > 0}{i === research.brushes.length - 1 ? ' &' : ','} {/if}{BrushName[brush]}{/each}.
          </div>
        </div>
      </Module>
    </div>
  {/if}
</DialogWithInventory>

<style>
  .select {
    background: rgba(0, 0, 0, .2);
    height: 1.375rem;
    font-size: 0.75rem;
  }
  .scroll {
    height: 512px;
    overflow-y: overlay;
  }
  .researching {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .research {
    display: flex;
    align-items: start;
    justify-content: start;
    flex-direction: column;
    padding: 0.75rem;
    gap: 0.25rem;
    box-sizing: border-box;
    width: 100%;
    height: auto;
    background: rgba(0, 0, 0, .2);
    border-radius: 0.5rem;
    color: #aaa;
  }
  .research:hover {
    color: #eee;
  }
  .research:disabled:hover {
    color: #aaa;
  }
  .brushes {
    display: flex;
    gap: 0.25rem;
  }
  .brush {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .image {
    width: 3rem;
    height: 3rem;
    padding: 0.5rem;
    background: rgba(0, 0, 0, .2);
    border-radius: 0.5rem;
  }
  .submodules {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0 1rem 1rem;
  }
  .current {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .name {
    display: flex;
    justify-content: space-between;
  }
  .percent {
    color: #aaa;
  }
  .info {
    color: #aaa;
  }
</style>
