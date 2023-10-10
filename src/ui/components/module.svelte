<div class="module">
  {#if $$slots.name}
    <div class="subheading">
      <slot name="name"></slot>
    </div>
  {/if}
  <div>
    <slot></slot>
  </div>
</div>

<style>
  .module {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .subheading {
    font-size: 1rem;
  }
</style>
