<script lang="ts" context="module">
  import { breaker } from '../../sounds';
  const sfx = new Audio(breaker);
  sfx.volume = 0.2;
</script>

<script lang="ts">
  import { onDestroy } from 'svelte';
  import { PoweredContainer } from '../../core/container';
  import Module from '../components/module.svelte';
  import Settings from '../stores/settings';

  export let instance: PoweredContainer;

  const toggle = () => {
    instance.setEnabled(!instance.isEnabled());
    $Settings.sfx && sfx.paused && sfx.play();
  };

  let enabled = instance.isEnabled();
  const onEnabled = () => {
    enabled = instance.isEnabled();
  };
  instance.addEventListener('enabled', onEnabled);
  onDestroy(() => (
    instance.removeEventListener('enabled', onEnabled)
  ));
</script>

<Module>
  <div slot="name">Enabled</div>
  <div>
    <button on:click={toggle} class="toggle" class:enabled={enabled}>
      {enabled ? 'ON' : 'OFF'}
    </button>
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
