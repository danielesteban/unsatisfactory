<script lang="ts">
  import Dialog from './components/dialog.svelte';
  import Heading from './components/heading.svelte';
  import Modules from './components/modules.svelte';
  import Module from './components/module.svelte';
  
  export let lastSave: Date;
  export let reset: () => void;
  export let save: () => void;

  let isOpen = false;
  const toggle = () => {
    isOpen = !isOpen;
  };

  const formatter = new Intl.RelativeTimeFormat('en', { style: 'short' });
</script>

<button class="settings" on:pointerdown={toggle}>
  <svg viewBox="0 0 16 16">
    <path d="M9 13.829A3.004 3.004 0 0 0 11 11a3.003 3.003 0 0 0-2-2.829V0H7v8.171A3.004 3.004 0 0 0 5 11c0 1.306.836 2.417 2 2.829V16h2v-2.171zm-5-6A3.004 3.004 0 0 0 6 5a3.003 3.003 0 0 0-2-2.829V0H2v2.171A3.004 3.004 0 0 0 0 5c0 1.306.836 2.417 2 2.829V16h2V7.829zm10 0A3.004 3.004 0 0 0 16 5a3.003 3.003 0 0 0-2-2.829V0h-2v2.171A3.004 3.004 0 0 0 10 5c0 1.306.836 2.417 2 2.829V16h2V7.829zM12 6V4h2v2h-2zM2 6V4h2v2H2zm5 6v-2h2v2H7z" fill-rule="evenodd"/>
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
    right: 4rem;
    background: transparent;
    min-width: auto;
    height: auto;
  }

  .settings > svg {
    fill: currentColor;
    stroke: #000;
    stroke-width: 0.25;
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

  .reset {
    background: rgba(255, 90, 90, .5);
  }
</style>
