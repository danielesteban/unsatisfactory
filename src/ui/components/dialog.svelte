<script lang="ts">
  import { onDestroy } from 'svelte';

  export let bodyClass: string = 'ui';
  export let close: () => void;

  let dom: HTMLDivElement;
  const keyup = ({ code, repeat }: KeyboardEvent) => {
    if (code !== 'Escape' || repeat) {
      return;
    }
    close();
  };
  const pointerdown = ({ target }: PointerEvent) => {
    if (target !== dom) {
      return;
    }
    close();
  };
  
  bodyClass && document.body.classList.add(bodyClass);
  onDestroy(() => bodyClass && document.body.classList.remove(bodyClass));
</script>

<svelte:document on:keyup={keyup} />

<div bind:this={dom} class="overlay" on:pointerdown={pointerdown}>
  <div class="container">
    <slot></slot>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(0.5rem);
    z-index: 1;
  }

  .container {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(2rem);
    border-radius: 1rem;
    width: 680px;
    min-height: 420px;
  }
</style>
