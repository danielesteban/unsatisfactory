<script lang="ts">
  import Module from '../components/module.svelte';
  import { Item, ItemName } from '../../objects/items';

  export let name: string;
  export let item: Item;
  export let rate: number;
  export let count: number = 1;
</script>

<Module>
  <div slot="name">{name}</div>
  <div>
    {60 * (5 / rate) * count} {ItemName[item]} <span class="rate">/ min</span>
  </div>
</Module>

<style>
  .rate {
    color: #999;
  }
</style>
