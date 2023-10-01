<script lang="ts">
  import { onDestroy } from 'svelte';
  import Transformer from '../../core/transformer';
  import { Generator } from '../../objects/generators';
  import { Miner } from '../../objects/miners';
  import Module from '../components/module.svelte';

  export let instance: Generator | Miner | Transformer;

  let progress = instance.getProgress();
  const onProgress = () => {
    progress = instance.getProgress();
  };
  (instance as any).addEventListener('progress', onProgress);
  onDestroy(() => {
    (instance as any).removeEventListener('progress', onProgress);
  });
</script>

<Module>
  <div slot="name">Production</div>
  <div class="progress" >
    <div style="width: {Math.round(progress * 100)}%" />
  </div>
</Module>

<style>
  .progress {
    background: rgba(0, 0, 0, .2);
    height: 0.5rem;
    border-radius: 0.5rem;
  }
  .progress > div {
    background: rgba(90, 255, 90, 0.5);
    height: 0.5rem;
    border-radius: 0.5rem;
  }
</style>
