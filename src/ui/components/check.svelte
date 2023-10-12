<script lang="ts">
  export let checked: boolean = false;
</script>

<div class="check">
  <svg viewBox="0 0 24 24">
    <path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    {#if checked}
      <path d="M7.75 12L10.58 14.83L16.25 9.17004" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    {/if}
  </svg>
</div>

<style>
  .check > svg {
    fill: none;
    stroke: currentColor;
    width: 1rem;
    height: 1rem;
  }
</style>
