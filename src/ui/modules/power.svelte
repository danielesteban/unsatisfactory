<script lang="ts">
  import { onDestroy } from 'svelte';
  import Module from '../components/module.svelte';
  import { PoweredContainer } from '../../core/container';

  export let instance: PoweredContainer;

  const consumption = instance.getConsumption();

  let enabled = instance.isEnabled();
  let powered = instance.isPowered();
  const onEnabled = () => {
    enabled = instance.isEnabled();
  };
  const onPowered = () => {
    powered = instance.isPowered();
  };
  instance.addEventListener('enabled', onEnabled);
  instance.addEventListener('powered', onPowered);
  onDestroy(() => {
    instance.addEventListener('enabled', onEnabled);
    instance.removeEventListener('powered', onPowered);
  });

  let status: string;
  $: if (!enabled) {
    status = 'Disabled';
  } else if (!powered) {
    status = 'Not enough power';
  } else {
    status = 'Powered';
  }
</script>

<Module>
  <div slot="name">Power Consumption</div>
  <div>
    <span class="consumption">{consumption}</span> MW <span class="status"> ∙ {status}</span>
  </div>
</Module>

<style>
  .consumption {
    font-weight: 600;
  }
  .status {
    color: #aaa;
  }
</style>
