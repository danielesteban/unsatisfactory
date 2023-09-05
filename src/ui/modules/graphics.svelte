<script lang="ts">
  import Module from '../components/module.svelte';
  import Settings from '../stores/settings';

  export let basic:boolean = false;

  const setAntialias = ({ currentTarget: { checked } }: Event & { currentTarget: EventTarget & HTMLInputElement; }) => {
    Settings.setAntialias(checked);
  };
  const setFOV = ({ currentTarget: { value } }: Event & { currentTarget: EventTarget & HTMLInputElement; }) => {
    const fov = parseInt(value, 10);
    Settings.setFOV(fov);
  };
  const setResolution = ({ currentTarget: { value } }: Event & { currentTarget: EventTarget & HTMLInputElement; }) => {
    const resolution = parseFloat(value);
    Settings.setResolution(resolution);
  };
</script>

<div class="graphics">
  <Module>
    <div slot="name">Resolution <span class="info">({Math.round($Settings.resolution * 100)}%)</span></div>
    <input
      type="range"
      min={0.25}
      max={1}
      step={0.25}
      value={$Settings.resolution}
      on:input={setResolution}
    />
  </Module>
  <Module>
    <div slot="name">Antialias</div>
    <label class="check">
      <input
        type="checkbox"
        checked={$Settings.antialias}
        on:change={setAntialias}
      />
      {#if $Settings.antialias}
        SMAA
      {:else}
        OFF
      {/if}
    </label>
  </Module>
</div>
{#if !basic}
  <Module>
    <div slot="name">FOV <span class="info">({$Settings.fov}°)</span></div>
    <input
      type="range"
      min={60}
      max={110}
      step={5}
      value={$Settings.fov}
      on:input={setFOV}
    />
  </Module>
{/if}
<style>
  .graphics {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 1rem;
  }
  .info {
    color: #aaa;
  }
  .check {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }
  input[type="checkbox"] {
    margin: 0;
  }
  input[type="range"] {
    width: 100%;
  }
</style>
