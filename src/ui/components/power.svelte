<script lang="ts">
  import Module from './module.svelte';
  import { PoweredContainer } from '../../core/container';

  export let instance: PoweredContainer;

  const consumption = instance.getConsumption();
  const powered = instance.isPowered();

  let enabled = instance.isEnabled();
  const toggle = () => {
    enabled = !instance.isEnabled();
    instance.setEnabled(enabled);
  };
</script>

<Module>
  <div slot="name">Enabled</div>
  <div>
    <button on:click={toggle} class="toggle" class:enabled={enabled}>
      {enabled ? 'ON' : 'OFF'}
    </button>
  </div>
</Module>
<Module>
  <div slot="name">Power</div>
  <div>
    {consumption}MW - {powered ? 'Powered' : 'Not enough power'}
  </div>
</Module>

<style>
  .toggle {
    background: rgba(255, 90, 90, .5);
  }
  .toggle.enabled {
    background: rgba(90, 255, 90, .5);
  }
</style>
