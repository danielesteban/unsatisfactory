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
  <div class="grid">
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
    <div class="help">
      <div>
        <div class="keys">
          <div>
            <div>W</div>
          </div>
          <div>
            <div>A</div>
            <div>S</div>
            <div>D</div>
          </div>
        </div>
        <div>Move</div>
      </div>
      <div>
        <div class="keys">
          <div>
            <div>E</div>
          </div>
        </div>
        <div>Interact</div>
      </div>
      <div>
        <div class="keys">
          <div>
            <div>R</div>
            <div>T</div>
          </div>
        </div>
        <div>Rotate</div>
      </div>
      <div>
        <div class="pointer">
          <svg viewBox="0 0 356.572 356.572">
            <path d="M181.563,0C120.762,0,59.215,30.525,59.215,88.873V237.5c0,65.658,53.412,119.071,119.071,119.071 c65.658,0,119.07-53.413,119.07-119.071V88.873C297.356,27.809,237.336,0,181.563,0z M274.945,237.5 c0,53.303-43.362,96.657-96.659,96.657c-53.299,0-96.657-43.354-96.657-96.657v-69.513c20.014,6.055,57.685,15.215,102.221,15.215 c28.515,0,59.831-3.809,91.095-14.567V237.5z M274.945,144.794c-81.683,31.233-168.353,7.716-193.316-0.364V88.873 c0-43.168,51.489-66.46,99.934-66.46c46.481,0,93.382,20.547,93.382,66.46V144.794z M190.893,48.389v81.248 c0,6.187-5.023,11.208-11.206,11.208c-6.185,0-11.207-5.021-11.207-11.208V48.389c0-6.186,5.021-11.207,11.207-11.207 C185.869,37.182,190.893,42.203,190.893,48.389z M154.938,40.068V143.73c-15.879,2.802-62.566-10.271-62.566-10.271 C80.233,41.004,154.938,40.068,154.938,40.068z"/>
          </svg>
        </div>
        <div>Build</div>
      </div>
      <div>
        <div class="pointer">
          <svg viewBox="0 0 356.572 356.572">
            <path d="M181.563,0C120.762,0,59.215,30.525,59.215,88.873V237.5c0,65.658,53.412,119.071,119.071,119.071 c65.658,0,119.07-53.413,119.07-119.071V88.873C297.356,27.809,237.336,0,181.563,0z M274.945,237.5 c0,53.303-43.362,96.657-96.659,96.657c-53.299,0-96.657-43.354-96.657-96.657v-69.513c20.014,6.055,57.685,15.215,102.221,15.215 c28.515,0,59.831-3.809,91.095-14.567V237.5z M274.945,144.794c-81.683,31.233-168.353,7.716-193.316-0.364V88.873 c0-43.168,51.489-66.46,99.934-66.46c46.481,0,93.382,20.547,93.382,66.46V144.794z M190.893,48.389v81.248 c0,6.187-5.023,11.208-11.206,11.208c-6.185,0-11.207-5.021-11.207-11.208V48.389c0-6.186,5.021-11.207,11.207-11.207 C185.869,37.182,190.893,42.203,190.893,48.389z M264.272,130.378c0,0-46.687,13.072-62.566,10.271V36.988 C201.706,36.988,276.412,37.923,264.272,130.378z"></path>
          </svg>
        </div>
        <div>Dismantle</div>
      </div>
      <div>
        <div class="pointer">
          <svg viewBox="0 0 356.572 356.572">
            <path d="M181.563,0C120.762,0,59.215,30.525,59.215,88.873V237.5c0,65.658,53.412,119.071,119.071,119.071 c65.658,0,119.07-53.413,119.07-119.071V88.873C297.356,27.809,237.336,0,181.563,0z M274.945,237.5 c0,53.303-43.362,96.657-96.659,96.657c-53.299,0-96.657-43.354-96.657-96.657v-69.513c20.014,6.055,57.685,15.215,102.221,15.215 c28.515,0,59.831-3.809,91.095-14.567V237.5z M274.945,144.794c-81.683,31.233-168.353,7.716-193.316-0.364V88.873 c0-43.168,51.489-66.46,99.934-66.46c46.481,0,93.382,20.547,93.382,66.46V144.794z M190.893,48.389v81.248 c0,6.187-5.023,11.208-11.206,11.208c-6.185,0-11.207-5.021-11.207-11.208V48.389c0-6.186,5.021-11.207,11.207-11.207 C185.869,37.182,190.893,42.203,190.893,48.389z"></path>
          </svg>
        </div>
        <div>Pick</div>
      </div>
      <div>
        <div class="keys">
          <div>
            <div class="spacebar">Space</div>
          </div>
        </div>
        <div>Move Up</div>
      </div>
      <div>
        <div class="keys">
          <div>
            <div class="shift">Shit</div>
          </div>
        </div>
        <div>Move Down</div>
      </div>
    </div>
  </div>
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
  :global(body.pointerlock) .settings {
    display: none;
  }
  .settings > svg {
    fill: currentColor;
    stroke: #000;
    stroke-width: 0.4;
    width: 1.5rem;
    height: 1.5rem;
    pointer-events: none;
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
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
  .help {
    display: flex;
    flex-direction: column;
    padding: 1rem;
    gap: 0.5rem;
  }
  .help > div {
    display: flex;
    align-items: center;
    gap: 2.75rem;
  }
  .help .keys {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 4.5rem;
    height: 2.75rem;
  }
  .help .keys > div {
    display: flex;
    gap: 0.25rem;
  }
  .help .keys > div > div {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1rem;
    height: 1rem;
    border: 2px solid #fff;
    border-radius: 0.25rem;
  }
  .help .keys > div > div.shift {
    width: 3.25rem;
  }
  .help .keys > div > div.spacebar {
    width: 4.5rem;
  }
  .help .pointer {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 4.5rem;
    height: 2.75rem;
  }
  .help .pointer > svg {
    fill: currentColor;
    width: 2.75rem;
    height: 2.75rem;
  }
</style>
