<script context="module" lang="ts">
  import { writable } from 'svelte/store';
  import { Brush, BrushName, Item, ItemName } from '../../core/data';

  enum Groups {
    items,
    brushes,
  }

  const entries = [
    Object.keys(ItemName)
      .filter((item) => parseInt(item, 10) !== Item.none)
      .map((item) => ({ group: Groups.items, id: parseInt(item, 10) as Exclude<Item, Item.none>, name: ItemName[parseInt(item, 10) as Exclude<Item, Item.none>] }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    Object.keys(BrushName)
      .filter((brush) => ![Brush.none, Brush.dismantle].includes(parseInt(brush, 10)))
      .map((brush) => ({ group: Groups.brushes, id: parseInt(brush, 10) as Exclude<Brush, Brush.none | Brush.dismantle>, name: BrushName[parseInt(brush, 10) as Exclude<Brush, Brush.none | Brush.dismantle>] }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  ];
  const selected = writable<{ group: Groups; id: number; }>({ group: Groups.items, id: entries[Groups.items][0].id });
  const select = (group: Groups, id: number) => () => (
    selected.set({ group, id })
  );
</script>

<script lang="ts">
  import Dialog from '../components/dialog.svelte';
  import Filter from '../components/filter.svelte';
  import Modules from '../components/modules.svelte';
  import BrushData from '../modules/brush.svelte';
  import ItemData from '../modules/item.svelte';

  export let close: () => void;
</script>

<Dialog close={close}>
  <Filter groups={entries} let:filtered>
    <div class="grid">
      <div class="entries">
        {#each filtered as group}
          {#each group as entry (entry.id)}
            <button class:selected={$selected.group === entry.group && $selected.id === entry.id} on:click={select(entry.group, entry.id)}>
              {entry.name}
            </button>
          {/each}
        {/each}
      </div>
      <Modules>
        {#if $selected.group === Groups.brushes}
          <BrushData brush={$selected.id} />
        {/if}
        {#if $selected.group === Groups.items}
          <ItemData item={$selected.id} />
        {/if}
      </Modules>
    </div>
  </Filter>
</Dialog>

<style>
  .grid {
    display: grid;
    grid-template-columns: auto 1fr;
  }
  .entries {
    width: 180px;
    height: 420px;
    background: rgba(0, 0, 0, .2);
    border-radius: 0 0 0 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    overflow-y: overlay;
  }
  .entries > button {
    flex-shrink: 0;
    background: rgba(0, 0, 0, .2);
    border-radius: 0;
    color: #aaa;
  }
  .entries > button:hover {
    color: #eee;
  }
  .entries > button.selected {
    background: rgba(90, 255, 90, 0.5);
    color: #eee;
  }
</style>
