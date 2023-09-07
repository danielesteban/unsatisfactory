
<script lang="ts">
  import { Brush, BrushName, ItemName, Building, defaultBuildCost } from '../../core/data';
  import Module from '../components/module.svelte';
  import BrushImage from '../components/brush.svelte';
  
  export let brush: Exclude<Brush, Brush.none>;

  $: cost = Building[brush] || defaultBuildCost;
</script>

<Module>
  <div slot="name">{BrushName[brush]}</div>
  <div class="info">
    <div class="image">
      <BrushImage brush={brush} />
    </div>
    <div class="data">
      <div class="heading">
        Building
      </div>
      <div>
        {#each cost as { item, count }}
          <div>
            <span class="count">{count}</span> {ItemName[item]}
          </div>
        {/each}
      </div>
    </div>
  </div>
</Module>

<style>
  .info {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 1rem;
  }
  .image {
    width: 10rem;
    height: 10rem;
    background: rgba(0, 0, 0, .2);
    border-radius: 0.5rem;
  }
  .data {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .heading {
    font-size: 1rem;
    line-height: 1em;
    color: #aaa;
  }
  .count {
    font-weight: 600;
  }
</style>
