<script lang="ts">
  import { onDestroy } from 'svelte';
  import Transformer from '../../core/transformer';
  import { Generator } from '../../objects/generators';
  import { Miner } from '../../objects/miners';
  import Module from '../components/module.svelte';
  import Progress from '../components/progress.svelte';

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
  <Progress value={progress} />
</Module>
