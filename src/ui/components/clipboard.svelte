<script lang="ts">
  export let value: () => string;

  let hasCopied = false;
  let timer = 0;
  const copy = () => {
    navigator.clipboard.writeText(value());
    hasCopied = true;
    clearTimeout(timer);
    timer = setTimeout(() => {
      hasCopied = false;
    }, 1000);
  };
</script>

<button on:click={copy}>
  {#if hasCopied}
    Copied to clipboard
  {:else}
    Copy link
  {/if}
</button>
