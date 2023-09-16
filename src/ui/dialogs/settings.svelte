<script lang="ts">
  import { onDestroy } from 'svelte';
  import Loader from '../../core/loader';
  import Clipboard from '../components/clipboard.svelte';
  import Cloudsaves from '../components/cloudsaves.svelte';
  import Dialog from '../components/dialog.svelte';
  import FPS from '../components/fps.svelte';
  import Grid from '../components/grid.svelte';
  import Heading from '../components/heading.svelte';
  import Modules from '../components/modules.svelte';
  import Module from '../components/module.svelte';
  import Graphics from '../modules/graphics.svelte';
  import Help from '../modules/help.svelte';
  import Settings from '../stores/settings';

  export let close: () => void;
  export let loader: Loader;

  const bodyClass = ['settings'];

  const browse = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.png';
    input.addEventListener('change', ({ target: { files: [file] } }: any) => {
      if (!file) {
        return;
      }
      loader.importFile(file);
    });
    input.click();
  };

  let lastDownloadURL: string;
  const download = (blob: Blob, filename: string) => {
    const downloader = document.createElement('a');
    downloader.download = filename;
    URL.revokeObjectURL(lastDownloadURL);
    downloader.href = lastDownloadURL = URL.createObjectURL(blob);
    downloader.click();
  };

  const downloadFile = () => (
    download(loader.exportFile(), 'unsatisfactory.json')
  );

  const downloadSteganography = async () => (
    download(await loader.exportSteganography(), 'unsatisfactory.png')
  );

  let hasSaved = false;
  let isSaving = false;
  let saveTimer = 0;
  const onSave = () => {
    clearTimeout(saveTimer);
    hasSaved = false;
    isSaving = true;
    return loader.save()
      .then(() => {
        hasSaved = true;
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
          hasSaved = false;
        }, 1000);
      })
      .catch(() => {
        // @dani @incomplete
        // Show error feedback. Retry?
      })
      .finally(() => {
        isSaving = false;
      });
  };

  const link = () => loader.exportLink();

  let isResetting = false;
  const toggleReset = () => {
    isResetting = !isResetting;
  };
  const reset = () => loader.reset();

  const formatter = new Intl.RelativeTimeFormat('en', { style: 'short' });
  const formattedTime = (date: Date) => {
    const diff = Math.ceil((date.getTime() - Date.now()) / 1000 / 60);
    return diff === 0 ? 'seconds ago' : formatter.format(diff, 'minutes');
  };

  let lastSave: Date;
  let lastSaveFormatted: string;
  let lastSaveUnsubscribe = Settings.subscribe(({ lastSave: date }) => {
    lastSave = date;
    lastSaveFormatted = formattedTime(date);
  });
  let lastSaveInterval = setInterval(() => {
    lastSaveFormatted = formattedTime(lastSave);
  }, 30000);

  onDestroy(() => {
    lastSaveUnsubscribe();
    clearTimeout(saveTimer);
    clearInterval(lastSaveInterval);
    URL.revokeObjectURL(lastDownloadURL);
  });
</script>

<Dialog bodyClass={bodyClass} close={close}>
  <Heading>
    Unsatisfactory
    <div slot="actions">
      <div class="info">
        <FPS />
      </div>
    </div>
  </Heading>
  <Grid>
    <Modules>
      <Graphics />
      <Module>
        <div slot="name">
          Save <span class="info">(Autosaved: {lastSaveFormatted})</span>
        </div>
        <div class="buttons">
          <button class="save" disabled={isSaving} on:click={onSave}>
            {#if isSaving}
              Saving...
            {:else if hasSaved}
              Saved!
            {:else}
              Save
            {/if}
          </button>
          <button on:click={downloadFile}>
            Export
          </button>
          <button on:click={browse}>
            Import
          </button>
        </div>
      </Module>
      <Module>
        <div slot="name">Cloudsaves <span class="info">(experimental)</span></div>
        <div>
          <Cloudsaves /> 
        </div>
      </Module>
      <Module>
        <div slot="name">Share a copy</div>
        <div class="buttons">
          <Clipboard value={link} /> 
          <button on:click={downloadSteganography}>
            Save as image
          </button>
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
    <Help />
  </Grid>
</Dialog>

<style>
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
    gap: 0.5rem;
  }
  .save {
    background: rgba(90, 255, 90, 0.5);
  }
  .reset {
    background: rgba(255, 90, 90, .5);
  }
</style>
