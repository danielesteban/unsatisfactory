<div class="heading">
  <slot></slot>
  <div class="actions">
    <slot name="actions"></slot>
  </div>
</div>

<style>
  .heading {
    display: flex;
    justify-content: space-between;
    font-size: 1.375rem;
    line-height: 1em;
    padding: 1rem;
    border-bottom: 2px solid rgba(255, 255, 255, 0.05);
  }
  .actions {
    display: flex;
  }
</style>
