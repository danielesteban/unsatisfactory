<script lang="ts">
  import Module from '../components/module.svelte';
  import { Item, ItemName } from '../../objects/items';

  export let name: string;
  export let items: { item: Item; count: number;} | { item: Item; count: number;}[];
  export let rate: number;
</script>

<Module>
  <div slot="name">{name}</div>
  <div class="items">
    {#each Array.isArray(items) ? items : [items] as { item, count } (item)}
      <div>
        <span class="count">{60 * (5 / rate) * count}</span> {ItemName[item]} <span class="rate">/ min</span>
      </div>
    {/each}
  </div>
</Module>

<style>
  .items {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .count {
    font-weight: 600;
  }
  .rate {
    color: #999;
  }
</style>
