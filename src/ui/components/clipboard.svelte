<script lang="ts">
  import Clicked from './clicked.svelte';

  export let value: () => string;

  const copy = () => (
    navigator.clipboard.writeText(value())
  );
</script>

<Clicked on:click={copy} let:click let:hasClicked>
  <button on:click={click}>
    {#if hasClicked}
      Copied to clipboard
    {:else}
      Copy link
    {/if}
  </button>
</Clicked>
