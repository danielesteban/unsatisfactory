<script lang="ts">
  import { Brush } from '../core/brush';

  export let brush: Brush;
  export let brushes: { id: Brush; name: string; }[];
</script>

<div class="brushes">
  {#each brushes as { id, name }, key (id)}
    <div class="brush" class:enabled={brush === id}>
      <div class="key">{key + 1}</div>
      <div>{name}</div>
    </div>
  {/each}
</div>

<style>
  .brushes {
    position: absolute;
    bottom: 1rem;
    left: 50%;
    transform: translate(-50%, 0);
    background: rgba(0, 0, 0, .2);
    padding: 0.25rem;
    gap: 0.25rem;
    border-radius: 0.5rem;
    display: none;
  }
  :global(body.pointerlock) .brushes {
    display: flex;
  }
  .brush {
    display: flex;
    background: rgba(0, 0, 0, .2);
    flex-direction: column;
    width: 4rem;
    justify-content: center;
    border-radius: 0.25rem;
    color: #999;
  }
  .brush.enabled {
    color: #eee;
  }
  .brush > div {
    display: flex;
    justify-content: center;
  }
  .key {
    border-radius: 0.25rem 0.25rem 0 0;
    background: rgba(0, 0, 0, .2);
  }
</style>
