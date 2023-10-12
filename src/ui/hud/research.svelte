<script lang="ts">
  import { onDestroy } from 'svelte';
  import { BrushName, Researching } from '../../core/data';
  import BrushImage from '../components/brush.svelte';
  import Check from '../components/check.svelte';
  import Research from '../stores/research';

  let completed: number[] = [];
  let current = new Set($Research);
  let timers: number[] = [];
  const unsubscribe = Research.subscribe(($Research) => {
    $Research.forEach((research) => {
      if (!current.has(research)) {
        current.add(research);
        completed = [...completed, research];
        const timer = setTimeout(() => {
          let i = completed.indexOf(research);
          if (i !== -1) {
            completed = [...completed.slice(0, i), ...completed.slice(i + 1)];
          }
          i = timers.indexOf(timer);
          if (i !== -1) {
            timers.splice(i, 1);
          }
        }, 15000);
        timers.push(timer);
      }
    });
  });
  onDestroy(() => {
    unsubscribe();
    timers.forEach((timer) => clearTimeout(timer));
  });
</script>

{#each completed as research}
  <div class="research">
    <div class="heading">
      <Check checked />
      <div>Research Completed</div>
    </div>
    <div class="name">
      {Researching[research].name}
    </div>
    <div class="brushes">
      {#each Researching[research].brushes as brush}
        <div class="brush">
          <div class="image">
            <BrushImage brush={brush} />
          </div>
          <div>
            {BrushName[brush]}
          </div>
        </div>
      {/each}
    </div>
  </div>
{/each}

<style>
  .research {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    background: rgba(90, 255, 90, 0.3);
    color: #111;
    backdrop-filter: blur(0.5rem);
    border-radius: 0.5rem;
  }
  .heading {
    display: flex;
    gap: 0.5rem;
    font-size: 1rem;
  }
  .name {
    font-size: 0.875rem;
  }
  .brushes {
    display: flex;
    gap: 0.25rem;
  }
  .brush {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    text-align: center;
  }
  .image {
    width: 3rem;
    height: 3rem;
    padding: 0.5rem;
    background: rgba(255, 255, 255, .2);
    border-radius: 0.5rem;
  }
</style>
