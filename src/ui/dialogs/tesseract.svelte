<script lang="ts" context="module">
  import { tap } from '../../sounds';
  const sfx = new Audio(tap);
  sfx.volume = 0.2;

  let lastId: string;
</script>

<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Tesseract } from '../../objects/tesseracts';
  import Dialog from '../components/dialog.svelte';
  import Grid from '../components/grid.svelte';
  import Heading from '../components/heading.svelte';
  import Modules from '../components/modules.svelte';
  import Module from '../components/module.svelte';
  import Power from '../modules/power.svelte';
  import Toggle from '../modules/toggle.svelte';
  import Settings from '../stores/settings';

  export let close: () => void;
  export let instance: Tesseract;

  let hasCopied = false;
  let hasCopiedTimer = 0;
  const copy = () => {
    lastId = instance.resetId();
    $Settings.sfx && sfx.paused && sfx.play();
    hasCopied = true;
    clearTimeout(hasCopiedTimer);
    hasCopiedTimer = setTimeout(() => {
      hasCopied = false;
    }, 1000);
  };

  let hasPasted = false;
  let hasPastedTimer = 0;
  const paste = () => {
    instance.setId(lastId);
    lastId = '';
    $Settings.sfx && sfx.paused && sfx.play();
    hasPasted = true;
    clearTimeout(hasPastedTimer);
    hasPastedTimer = setTimeout(() => {
      hasPasted = false;
    }, 1000);
  };

  let isLinked = instance.isLinked();
  const onLink = () => {
    isLinked = instance.isLinked();
  };
  instance.addEventListener('link', onLink);

  onDestroy(() => {
    clearTimeout(hasCopiedTimer);
    clearTimeout(hasPastedTimer);
    instance.removeEventListener('link', onLink);
  });
</script>

<Dialog close={close}>
  <Heading>
    Tesseract
  </Heading>
    <Grid>
      <Modules>
        <Toggle instance={instance} />
        <Power instance={instance} />
      </Modules>
      <Modules>
      <Module>
        <div slot="name">Quantum Link</div>
        <div class="link">
          <div>
            <span class="info">Status:</span>
            <span class="status" class:active={isLinked}>
              {isLinked ? 'Entangled' : 'Disentangled'}
            </span>
          </div>
          <div class="actions">
            <button
              on:click={copy}
            >
              {hasCopied ? 'Copied!' : 'Copy'}
            </button>
            <button
              disabled={!lastId}
              on:click={paste}
            >
              {hasPasted ? 'Pasted!' : 'Paste'}
            </button>
          </div>
        </div>
      </Module>
    </Modules>
  </Grid>
</Dialog>

<style>
  .link {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
  }
  .info {
    color: #aaa;
  }
  .status {
    color: #eaa;
  }
  .status.active {
    color: #aea;
  }
</style>
