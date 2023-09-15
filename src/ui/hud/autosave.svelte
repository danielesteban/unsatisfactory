<script lang="ts">
  import { onDestroy } from 'svelte';
  import Loader from '../../core/loader';

  export let loader: Loader;

  const countdown = 10;
  let count = 0;
  let timer = 0;
  let hasSaved = false;
  let hasSavedTimer = 0;
  let isCounting = false;
  let isSaving = false;
  const counter = () => {
    const now = performance.now();
    const elapsed = Math.floor((now - timer) / 1000);
    if (elapsed >= countdown) {
      isCounting = false;
      isSaving = true;
      loader.save()
        .then(() => {
          hasSaved = true;
          hasSavedTimer = setTimeout(() => {
            hasSaved = false;
          }, 1000);
        })
        .catch(() => {
          // @dani @incomplete
          // Show error feedback. Retry?
        })
        .finally(() => {
          isSaving = false;
        });
      return;
    }
    requestAnimationFrame(counter);
    count = countdown - elapsed;
  };
  const autosave = () => {
    isCounting = true;
    timer = performance.now();
    requestAnimationFrame(counter);
  };
  const autosaveInterval = setInterval(autosave, 120000);
  onDestroy(() => {
    clearInterval(autosaveInterval);
    clearTimeout(hasSavedTimer);
  });
</script>

{#if isCounting || isSaving || hasSaved}
  <div class="autosave" class:saved={hasSaved}>
    {#if isCounting}
      Autosaving in {count}...
    {/if}
    {#if isSaving}
      Saving...
    {/if}
    {#if hasSaved}
      Saved!
    {/if}
  </div>
{/if}

<style>
  @keyframes slideIn {
    0% {
      left: -8rem;
    }
    100% {
      left: 0;
    }
  }

  @keyframes slideOut {
    0% {
      left: 0;
    }
    100% {
      left: -8rem;
    }
  }

  .autosave {
    position: absolute;
    bottom: 0.75rem;
    left: 0;
    background: rgba(0, 0, 0, .2);
    padding: 0.25rem 0;
    display: flex;
    justify-content: center;
    width: 8rem;
    border-radius: 0 0.25rem 0.25rem 0;
    pointer-events: none;
    z-index: 2;
    animation: 0.15s ease-out forwards slideIn;
  }

  .autosave.saved {
    animation: 0.3s ease-in forwards slideOut;
  }
</style>
