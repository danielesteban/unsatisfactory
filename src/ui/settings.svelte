<script lang="ts">
  import Dialog from './components/dialog.svelte';
  import Heading from './components/heading.svelte';
  import Modules from './components/modules.svelte';
  import Module from './components/module.svelte';
  
  export let lastSave: Date;
  export let download: () => void;
  export let load: () => void;
  export let reset: () => void;
  export let save: () => void;

  let isOpen = false;
  const toggle = () => {
    isOpen = !isOpen;
  };

  const formatter = new Intl.RelativeTimeFormat('en', { style: 'short' });
</script>

<button class="settings" on:pointerdown={toggle}>
  <svg viewBox="0 0 15 15">
    <path d="M1.5 1C0.671573 1 0 1.67157 0 2.5V12.5C0 13.3284 0.671573 14 1.5 14H13.5C14.3284 14 15 13.3284 15 12.5V4.5C15 3.67157 14.3284 3 13.5 3H7.70711L5.70711 1H1.5Z"/>
  </svg>
</button>

{#if isOpen}
<Dialog close={toggle}>
  <Heading>Unsatisfactory</Heading>
  <Modules>
    <Module>
      <div slot="name">Save <span class="last">(last: {formatter.format(Math.floor((lastSave.getTime() - Date.now()) / 1000 / 60), 'minutes')})</span></div>
      <div>
        <button on:click={save}>
          Save
        </button>
      </div>
    </Module>
    <Module>
      <div slot="name">File</div>
      <div class="buttons">
        <button on:click={download}>
          Export
        </button>
        <button on:click={load}>
          Import
        </button>
      </div>
    </Module>
    <Module>
      <div slot="name">Danger Zone</div>
      <div>
        <button on:click={reset} class="reset">
          Reset
        </button>
      </div>
    </Module>
  </Modules>
</Dialog>
{/if}

<style>
  .settings {
    position: absolute;
    top: 1rem;
    right: 3.5rem;
    background: transparent;
    min-width: auto;
    height: auto;
  }

  .settings > svg {
    fill: currentColor;
    stroke: #000;
    stroke-width: 0.4;
    width: 1.5rem;
    height: 1.5rem;
    pointer-events: none;
  }

  :global(body.pointerlock) .settings {
    display: none;
  }
  
  .last {
    color: #aaa;
  }

  .buttons {
    display: flex;
    gap: 0.25rem;
  }

  .reset {
    background: rgba(255, 90, 90, .5);
  }
</style>
