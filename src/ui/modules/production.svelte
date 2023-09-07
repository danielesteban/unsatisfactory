<script lang="ts">
  import { Item, ItemName } from '../../core/data';
  import Simulation from '../../core/simulation';
  import ItemImage from '../components/item.svelte';
  import Module from '../components/module.svelte';
  
  export let name: string;
  export let items: { item: Exclude<Item, Item.none>; count: number; buffer: number; } | { item: Exclude<Item, Item.none>; count: number; buffer: number; }[];
  export let rate: number;
  export let onBuffer: (item: Exclude<Item, Item.none>) => (e: PointerEvent) => void;
</script>

<Module>
  <div slot="name">{name}</div>
  <div class="items">
    {#each Array.isArray(items) ? items : [items] as { item, count, buffer } (item)}
      <div class="item">
        <div
          class="buffer"
          on:pointerdown={onBuffer(item)}
        >
          {#if buffer}
            <ItemImage item={item} multiple let:images>
              {#each images as image}
                <!-- svelte-ignore a11y-missing-attribute -->
                <img src={image} />
              {/each}
            </ItemImage>
            <div class="bufferCount">
              {buffer}
            </div>
          {/if}
        </div>
        <div class="info">
          <div><span class="count">{count}</span> {ItemName[item]}</div>
          <div class="rate">{60 * (Simulation.tps / rate) * count} / min</div>
        </div>
      </div>
    {/each}
  </div>
</Module>

<style>
  .items {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }
  .count {
    font-weight: 600;
  }
  .rate {
    color: #aaa;
    font-size: 0.6875rem;
  }

  .item {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .buffer {
    width: 3.125rem;
    aspect-ratio: 1;
    position: relative;
    background: rgba(0, 0, 0, .2);
    border-radius: 0.25rem;
  }
  .buffer > img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
  .buffer > img:nth-child(2) {
    display: none;
  }
  .buffer:hover > img:nth-child(1) {
    display: none;
  }
  .buffer:hover > img:nth-child(2) {
    display: block;
  }
  .bufferCount {
    position: absolute;
    bottom: 0.125rem;
    right: 0.125rem;
    font-size: 0.625rem;
    pointer-events: none;
    background: rgba(0, 0, 0, .2);
    border-radius: 0.25rem;
    padding: 0 0.25rem;
  }
</style>
