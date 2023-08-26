<script lang="ts">
  import { derived } from 'svelte/store';
  import { Brush, set, subscribe } from '../core/brush';
  import slots from './stores/hotbar';
  import { captureBrush } from './capture';

  const current = { subscribe };

  const keydown = ({ code, repeat }: KeyboardEvent) => {
    if (code.length !== 6 || code.slice(0, 5) !== 'Digit' || repeat || !document.body.classList.contains('pointerlock')) {
      return;
    }
    const digit = parseInt(code.slice(5), 10);
    const slot = digit === 0 ? 9 : (digit - 1);
    const brush = slot >= $slots.length ? Brush.none : $slots[slot];
    set($current === brush ? Brush.none : brush);
  };

  const isEmpty = derived([slots], ([$slots]) => $slots.findIndex((brush) => brush !== Brush.none) === -1);
</script>

<svelte:document on:keydown={keydown} />

<div class="hotbar" class:empty={$isEmpty}>
  {#each $slots as id, index}
    <div class="slot" class:enabled={id !== Brush.none && $current === id}>
      <div class="key">{index + 1}</div>
      <div class="brush">
        {#if id !== Brush.none}
          {#await captureBrush(id) then images}
            <!-- svelte-ignore a11y-missing-attribute -->
            <img src={images[0]} />
          {/await}
        {/if}
      </div>
    </div>
  {/each}
</div>

<style>
  .hotbar {
    position: absolute;
    bottom: 1rem;
    left: 50%;
    transform: translate(-50%, 0);
    background: rgba(0, 0, 0, .2);
    padding: 0.25rem;
    gap: 0.25rem;
    border-radius: 0.5rem;
    pointer-events: none;
    z-index: 2;
    display: none;
  }
  :global(body.pointerlock) .hotbar {
    display: flex;
  }
  :global(body.pointerlock) .hotbar.empty {
    display: none;
  }
  :global(body.hotbar) .hotbar {
    display: flex;
  }

  .slot {
    display: flex;
    background: rgba(0, 0, 0, .2);
    flex-direction: column;
    width: 4rem;
    justify-content: center;
    border-radius: 0.25rem;
    border: 1px solid transparent;
    color: #999;
  }
  .slot.enabled {
    border-color: rgba(90, 255, 90, .5);
  }
  .slot > div {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .key {
    border-radius: 0.1875rem 0.1875rem 0 0;
    background: rgba(0, 0, 0, .2);
  }
  .slot.enabled .key {
    color: #eee;
    background: rgba(90, 255, 90, .5);
  }
  .brush {
    height: 2.5rem;
  }
  .brush > img {
    height: 100%;
  }
</style>
