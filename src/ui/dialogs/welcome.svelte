<script lang="ts">
  import Dialog from '../components/dialog.svelte';
  import FPS from '../components/fps.svelte';
  import Grid from '../components/grid.svelte';
  import Heading from '../components/heading.svelte';
  import Graphics from '../modules/graphics.svelte';
  import Help from '../modules/help.svelte';
  import Settings from '../stores/settings';

  export let close: () => void;

  const bodyClass: string[] = [];
</script>

<Dialog bodyClass={bodyClass} close={close}>
  <Heading>
    Unsatisfactory
  </Heading>
  <Grid>
    <div class="welcome">
      <div>
        <div class="heading">Welcome!</div>
        <p>This is my love letter to Satisfactory.</p>
        <p>Is also free opensource software:<br /><a href="https://github.com/danielesteban/unsatisfactory" rel="noopener noreferrer" target="_blank">https://github.com/danielesteban/unsatisfactory</a></p>
        <p>
          <span class="info">Hardware requirements:</span><br />
          An average CPU<br />
          A somewhat beefy GPU
        </p>
        <p>
          <span class="info">Your current GPU:</span><br />
          {$Settings.gpu}
        </p>
        <p>
          <span class="info">Your current framerate:</span><br />
          <FPS />
        </p>
      </div>
      <div class="settings">
        <Graphics basic />
        <button class="play" on:click={close}>
          Play
        </button>
      </div>
    </div> 
    <Help />
  </Grid>
</Dialog>

<style>
  .welcome {
    display: grid;
    grid-template-rows: 1fr auto;
    gap: 2rem;
    padding: 1rem;
  }
  .settings {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .play {
    font-size: 1rem;
    width: 100%;
    height: 2.5rem;
    background: rgba(90, 255, 90, 0.5);
    border-radius: 0.75rem;
  }
  .heading {
    font-size: 1rem;
    margin-bottom: 1rem;
  }
  .info {
    color: #aaa;
  }
</style>
