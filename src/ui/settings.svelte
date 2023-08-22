<script lang="ts">
  import SFX from '../core/sfx';
  import { close as closeCurrentUI } from '.';
  import Autosave from './components/autosave.svelte';
  import Clipboard from './components/clipboard.svelte';
  import Dialog from './components/dialog.svelte';
  import Grid from './components/grid.svelte';
  import Heading from './components/heading.svelte';
  import Modules from './components/modules.svelte';
  import Module from './components/module.svelte';
  import Help from './modules/help.svelte';
  import Welcome from './modules/welcome.svelte';
  
  export let download: () => void;
  export let link: () => string;
  export let load: () => void;
  export let reset: () => void;
  export let save: () => void;
  export let sfx: SFX;

  let isMuted = sfx.getMuted();
  const toggleSFX = () => {
    isMuted = !sfx.getMuted();
    sfx.setMuted(isMuted);
  };

  let isOpen = true;
  let isResetting = false;
  let isWelcome = true;

  const toggleReset = () => {
    isResetting = !isResetting;
  };

  const toggleSettings = () => {
    isOpen = !isOpen;
    isResetting = false;
    if (isOpen) {
      closeCurrentUI();
    } else {
      document.getElementById('viewport')!.requestPointerLock();
    }
    if (isWelcome) {
      isWelcome = false;
    }
  };

  let lastSave: Date = new Date();
  const trackSave = () => {
    lastSave = new Date();
    save();
  };

  const formatter = new Intl.RelativeTimeFormat('en', { style: 'short' });
  const formattedTime = (date: Date) => {
    const diff = Math.floor((date.getTime() - Date.now()) / 1000 / 60);
    return formatter.format(diff, 'minutes');
  };
</script>

<Autosave save={trackSave} />

<div class="actions">
  {#if !isOpen}
    <button class="settings" on:click={toggleSettings}>
      <svg viewBox="0 0 15 15">
        <path d="M1.5 1C0.671573 1 0 1.67157 0 2.5V12.5C0 13.3284 0.671573 14 1.5 14H13.5C14.3284 14 15 13.3284 15 12.5V4.5C15 3.67157 14.3284 3 13.5 3H7.70711L5.70711 1H1.5Z"/>
      </svg>
    </button>
  {/if}
  <button class="sfx" on:click={toggleSFX}>
    {#if isMuted}
      <svg viewBox="0 0 48 48">
        <polygon points="7.729,43.099 18.178,32.65 29.824,41.971 29.824,21.004 42.558,8.271 39.729,5.442 29.824,15.348 29.824,5.646 17.127,15.81 9.824,15.81 9.824,31.81 13.362,31.81 4.901,40.271"/>
      </svg>
    {:else}
      <svg viewBox="0 0 48 48">
        <polygon points="24,42.16 24,5.835 11.303,15.999 4,15.998 4,31.998 11.303,31.999"/>
        <path d="M28,27.999v4c4.411,0,8-3.589,8-8s-3.589-8-8-8v4c2.206,0,4,1.794,4,4S30.206,27.999,28,27.999z"/>
        <path d="M44,23.999c0-9.374-7.626-17-17-17v4c7.168,0,13,5.832,13,13s-5.832,13-13,13v4C36.374,40.999,44,33.373,44,23.999z"/>
      </svg>
    {/if}
  </button>
</div>

{#if isOpen}
<Dialog close={toggleSettings}>
  <Heading>Unsatisfactory</Heading>
  <Grid>
    {#if isWelcome}
      <Welcome play={toggleSettings} />
    {:else}
      <Modules>
        <Module>
          <div slot="name">
            Save <span class="info">(last: {formattedTime(lastSave)})</span>
          </div>
          <div>
            <button on:click={trackSave}>
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
          <div slot="name">Share</div>
          <div class="buttons">
            <Clipboard value={link} /> 
          </div>
        </Module>
        <Module>
          <div slot="name">Danger Zone</div>
            {#if isResetting}
              <div class="confirm">
                <div class="info">Are you sure?</div>
                <div class="buttons">
                  <button on:click={toggleReset}>
                    No
                  </button>
                  <button on:click={reset} class="reset">
                    Yes
                  </button>
                </div>
              </div>
            {:else}
              <div>
                <button on:click={toggleReset} class="reset">
                  Reset
                </button>
              </div>
            {/if}
        </Module>
      </Modules>
    {/if}
    <Help />
  </Grid>
</Dialog>
{/if}

<style>
  .actions {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    display: flex;
    z-index: 2;
  }
  :global(body.pointerlock) .actions {
    display: none;
  }
  .settings, .sfx {
    background: transparent;
    min-width: auto;
    height: auto;
    padding: 0.5rem;
  }
  .settings > svg, .sfx > svg {
    fill: currentColor;
    stroke: #000;
    width: 1.5rem;
    height: 1.5rem;
    pointer-events: none;
  }
  .settings > svg {
    stroke-width: 0.4;
  }
  .info {
    color: #aaa;
  }
  .confirm {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .buttons {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  .reset {
    background: rgba(255, 90, 90, .5);
  }
</style>
