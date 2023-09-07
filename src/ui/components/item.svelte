<script context="module" lang="ts">
  import { writable, Readable } from 'svelte/store';
  import { captureItem } from '../../core/capture';
  import { Item } from '../../core/data';

  const items = new Map<Exclude<Item, Item.none>, Readable<string[]>>();
  const getImages = (item: Exclude<Item, Item.none>) => {
    let images = items.get(item);
    if (!images) {
      const { subscribe, set } = writable<string[]>([]);
      images = { subscribe };
      captureItem(item).then(set);
      items.set(item, images);
    }
    return images;
  };
</script>

<script lang="ts">
  export let item: Exclude<Item, Item.none>;
  export let multiple: boolean = false;

  $: images = getImages(item);
</script>

{#if multiple}
  <slot images={$images} />
{:else}
  <!-- svelte-ignore a11y-missing-attribute -->
  {#if $images[1]}<img src={$images[1]} />{/if}
{/if}

<style>
  img {
    height: 100%;
    pointer-events: none;
  }
</style>
