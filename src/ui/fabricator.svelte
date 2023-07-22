<script lang="ts">
  import Dialog from './dialog.svelte';
  import { Fabricator } from '../objects/fabricators';

  export let close: () => void;
  export let instance: Fabricator;

  const consumption = instance.getConsumption();
  const powered = instance.isPowered();

  let enabled = instance.isEnabled();
  const toggle = () => {
    enabled = !instance.isEnabled();
    instance.setEnabled(enabled);
  };
</script>

<Dialog close={close}>
  <div class="heading">Fabricator</div>
  <div class="modules">
    <div class="module">
      <div class="subheading">Enabled</div>
      <div>
        <button on:click={toggle} class="toggle" class:enabled={enabled}>
          {enabled ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
    <div class="module">
      <div class="subheading">Power</div>
      <div>
        {consumption}MW - {powered ? 'Powered' : 'Not enough power'}
      </div>
    </div>
  </div>
</Dialog>

<style>
  .heading {
    font-size: 1.25rem;
    line-height: 1em;
    padding: 1rem;
    text-align: center;
  }
  .subheading {
    font-size: 1rem;
  }
  .modules {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }
  .module {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .toggle {
    background: rgba(255, 90, 90, .5);
  }
  .toggle.enabled {
    background: rgba(90, 255, 90, .5);
  }
</style>
