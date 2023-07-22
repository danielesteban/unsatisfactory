<div class="module">
  <div class="subheading">
    <slot name="name"></slot>
  </div>
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
