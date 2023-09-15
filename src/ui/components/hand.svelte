<script context="module" lang="ts">
  import { Writable } from 'svelte/store';
  import { Item } from '../../core/data';
  import Inventory from '../../core/inventory';

  export type Hand = Writable<{ item: Exclude<Item, Item.none>; count: number; slot: number; } | undefined>;
</script>

<script lang="ts">
  import { onDestroy } from 'svelte';
  import ItemImage from './item.svelte';

  export let hand: Hand;
  export let inventory: Inventory;

  let x: number = 0;
  let y: number = 0;
  const pointermove = ({ clientX, clientY, isPrimary }: PointerEvent) => {
    if (!isPrimary) {
      return;
    }
    x = clientX;
    y = clientY;
  };

  onDestroy(() => {
    if (!$hand) {
      return;
    }
    const { item, count, slot } = $hand;
    const remaining = inventory.addToSlot(slot, item, count);
    if (remaining) {
      inventory.input(item, remaining);
    }
  });
</script>

<svelte:document on:pointermove={pointermove} />

{#if $hand}
  <div class="hand" style="--x:{x}px; --y:{y}px;">
    <ItemImage item={$hand.item} />
    <div class="count">
      {$hand.count}
    </div>
  </div>
{/if}

<style>
  .hand {
    position: absolute;
    left: var(--x);
    top: var(--y);
    transform: translate(-50%, -50%);
    width: 3.5rem;
    height: 3.5rem;
    pointer-events: none;
    z-index: 2;
  }
  .count {
    position: absolute;
    bottom: 0.125rem;
    right: 0.125rem;
    font-size: 0.625rem;
    background: rgba(0, 0, 0, .2);
    border-radius: 0.25rem;
    padding: 0 0.25rem;
  }
</style>
