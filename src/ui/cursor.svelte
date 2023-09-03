<script lang="ts">
  import { derived } from 'svelte/store';
  import { Brush, names, subscribe } from '../core/brush';
  import { Item, ItemName } from '../objects/items';
  import ItemImage from './components/item.svelte';
  import Inventory from './stores/inventory';

  export let action: 'belt' | 'build' | 'configure' | 'dismantle' | 'invalid' | 'unaffordable' | 'wire' | 'yield' | undefined;
  export let cost: { item: Exclude<Item, Item.none>; count: number; }[] | undefined = undefined;
  export let item: Item = Item.none;
  export let objectBrush: Brush = Brush.none;
  export let fromBrush: Brush = Brush.none;
  export let value: number = 0;

  $: object = objectBrush === Brush.none ? undefined : names[objectBrush];
  $: from = fromBrush === Brush.none ? undefined : names[fromBrush];

  const brush = derived([{ subscribe }], ([$brush]) => {
    if ($brush === Brush.none) {
      return undefined;
    }
    if ($brush === Brush.dismantle) {
      return 'Dismantling';
    }
    return `Building ${names[$brush]}`;
  });
</script>

<div class="cursor">
  <div class="crosshair"></div>
  {#if action}
    <div class="action">
      {#if action === 'belt'}
        Belt from <span class="object">{from || object}</span>{#if from} to <span class="object">{object}</span>{/if}
      {:else if action === 'build'}
        Press <span class="key">R</span> or <span class="key">T</span> to rotate
      {:else if action === 'configure'}
        Press <span class="key">E</span> to configure <span class="object">{object}</span>
      {:else if action === 'dismantle'}
        Dismantle <span class="object">{object}</span>
      {:else if action === 'invalid'}
        Invalid placement
      {:else if action === 'unaffordable'}
        Can't afford
      {:else if action === 'wire'}
        Wire from <span class="object">{from || object}</span>{#if from} to <span class="object">{object}</span>{/if}
      {:else if action === 'yield'}
        <span class="object">{ItemName[item]}</span> ({value === 1 ? 'Pure' : 'Impure'})
      {/if}
    </div>
  {/if}
  {#if cost && (action === 'belt' || action === 'build' || action === 'invalid' || action === 'unaffordable' || action === 'wire')}
    <div class="cost">
      {#each cost as { item, count }}
        <div class="item">
          <ItemImage item={item} />
          <div class="count" class:unaffordable={Inventory.getCount(item) < count}>
            {Inventory.getCount(item)}/{count}
          </div>
        </div>
      {/each}
    </div>
  {/if}
  {#if $brush}
    <div class="brush">
      {$brush}
    </div>
  {/if}
</div>

<style>
  .cursor {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: none;
    flex-direction: column;
    align-items: center;
  }

  :global(body.pointerlock) .cursor {
    display: flex;
  }

  .crosshair {
    width: 0.5rem;
    height: 0.5rem;
    border: 0.25rem solid rgb(238, 238, 238, 0.3);
    border-radius: 0.5rem;
    box-shadow: 0 0 0.25rem rgba(0, 0, 0, 0.3);
  }

  .action, .brush, .cost {
    position: absolute;
    white-space: nowrap;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    background: rgba(0, 0, 0, .4);
    backdrop-filter: blur(0.5rem);
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .action {
    top: 100%;
    margin-top: 0.75rem;
    color: #aaa;
  }

  .brush {
    font-size: 1rem;
    bottom: 100%;
    margin-bottom: 0.75rem;
  }

  .cost {
    top: 100%;
    margin-top: 3.25rem;
    padding: 0.25rem;
  }

  .item {
    width: 2rem;
    height: 2rem;
    position: relative;
    background: rgba(0, 0, 0, .2);
    font-size: 0.625rem;
    line-height: 1em;
    border-radius: 0.25rem;
  }
  .item .count {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(0, 0, 0, .2);
    border-radius: 0 0 0.25rem 0.25rem;
    text-align: center;
    pointer-events: none;
  }
  .item .count.unaffordable {
    color: #e55;
  }

  .key {
    display: inline-flex;
    width: 1rem;
    height: 1rem;
    border-radius: 0.25rem;
    background: rgba(0, 0, 0, .2);
    align-items: center;
    justify-content: center;
  }

  .key, .object {
    color: #eee;
  }
</style>
