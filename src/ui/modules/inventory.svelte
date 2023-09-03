
<script lang="ts">
  import Inventory from '../../core/inventory';
  import { Item, ItemName } from '../../objects/items';
  import { Hand } from '../components/hand.svelte';
  import { captureItem } from '../capture';

  export let inventory: Inventory;
  export let hand: Hand;
  export let onPush: ((slot: number, count: number) => void) | undefined = undefined;

  const pointerdown = (slot: number) => ({ button, isPrimary, shiftKey }: PointerEvent) => {
    if (!isPrimary) {
      return;
    }
    if ($hand) {
      const { item, count, slot: from } = $hand;
      const dest = inventory.getSlot(slot);
      if (dest.item !== Item.none && dest.item !== item) {
        $hand = { item: dest.item, count: inventory.getFromSlot(slot, dest.count), slot: from };
        inventory.addToSlot(slot, item, count);
        return;
      }
      const amount = button === 2 ? 1 : count;
      let remaining = count - amount;
      remaining += inventory.addToSlot(slot, item, amount);
      $hand = remaining > 0 ? { item, count: remaining, slot: from} : undefined;
      return;
    }
    const { item, count } = $inventory[slot];
    if (shiftKey) {
      if (item !== Item.none && onPush) {
        onPush(slot, button === 2 ? Math.ceil(count / 2) : count);
      }
      return;
    }
    if (item !== Item.none) {
      $hand = { item, count: inventory.getFromSlot(slot, button === 2 ? Math.ceil(count / 2) : count), slot };
    }
  };
</script>
  
<div class="slots">
  {#each $inventory as { item, count }, slot}
    <div
      class="slot"
      on:pointerdown={pointerdown(slot)}
    >
      {#if item !== Item.none}
        {#await captureItem(item) then images}
          {#each images as image}
            <!-- svelte-ignore a11y-missing-attribute -->
            <img src={image} />
          {/each}
        {/await}
        <div class="name">
          {ItemName[item]}
        </div>
        <div class="count">
          {count}
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .slots {
    box-sizing: border-box;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.0625rem;
    padding: 0 1rem;
    height: 100%;
    overflow-y: overlay;
  }
  .slot {
    aspect-ratio: 1;
    position: relative;
    background: rgba(0, 0, 0, .2);
    font-size: 0.625rem;
  }
  .slot > img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
  .slot > img:nth-child(2) {
    display: none;
  }
  .slot:hover > img:nth-child(1) {
    display: none;
  }
  .slot:hover > img:nth-child(2) {
    display: block;
  }
  .name {
    position: absolute;
    left: 0;
    right: 0;
    top: 0.125rem;
    text-align: center;
    white-space: nowrap;
    pointer-events: none;
    display: none;
  }
  .slot:hover .name {
    display: block;
  }
  .count {
    position: absolute;
    bottom: 0.125rem;
    right: 0.125rem;
    background: rgba(0, 0, 0, .2);
    border-radius: 0.25rem;
    padding: 0 0.25rem;
    pointer-events: none;
  }
</style>
