
<script context="module" lang="ts">
  import { writable, Readable } from 'svelte/store';
  import { Brush } from '../../core/brush';
  import { captureBrush } from '../capture';
  
  const brushes = new Map<Exclude<Brush, Brush.none>, Readable<string[]>>();
  const getImages = (brush: Exclude<Brush, Brush.none>) => {
    let images = brushes.get(brush);
    if (!images) {
      const { subscribe, set } = writable<string[]>([]);
      images = { subscribe };
      captureBrush(brush).then(set);
      brushes.set(brush, images);
    }
    return images;
  };
</script>

<script lang="ts">
  export let brush: Exclude<Brush, Brush.none>;
  export let multiple: boolean = false;

  $: images = getImages(brush);
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
