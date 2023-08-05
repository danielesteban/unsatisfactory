<script lang="ts">
  import { onDestroy } from 'svelte';
  import Module from '../components/module.svelte';
  import { PoweredContainer } from '../../core/container';

  export let instance: PoweredContainer;

  const consumption = instance.getConsumption();

  let enabled = instance.isEnabled();
  let powered = instance.isPowered();
  const onEnabled = ({ status }: { status: boolean }) => {
    enabled = status;
  };
  const onPowered = ({ status }: { status: boolean }) => {
    powered = status;
  };
  instance.addEventListener('enabled', onEnabled as any);
  instance.addEventListener('powered', onPowered as any);
  onDestroy(() => {
    instance.addEventListener('enabled', onEnabled as any);
    instance.removeEventListener('powered', onPowered as any);
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
    {consumption}MW <span class="status"> ∙ {status}</span>
  </div>
</Module>

<style>
  .status {
    color: #999;
  }
</style>
