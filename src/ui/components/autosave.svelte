<script lang="ts">
  export let save: () => void;

  const countdown = 10;
  let count = 0;
  let timer = 0;
  let isCounting = false;
  let hasSaved = false;
  const counter = () => {
    const now = performance.now();
    const elapsed = Math.floor((now - timer) / 1000);
    if (elapsed >= countdown) {
      isCounting = false;
      hasSaved = true;
      save();
      setTimeout(() => {
        hasSaved = false;
      }, 1000);
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
  setInterval(autosave, 300000);
</script>

{#if isCounting || hasSaved}
  <div class="autosave" class:saved={hasSaved}>
    {#if isCounting}
      Autosaving in {count}...
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
    top: 1rem;
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
