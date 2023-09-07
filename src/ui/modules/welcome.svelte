<script lang="ts">
  import FPS from '../components/fps.svelte';
  import Settings from '../stores/settings';
  import Graphics from './graphics.svelte';

  export let play: () => void;
</script>

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
    <button class="play" on:click={play}>
      Play
    </button>
  </div>
</div> 

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
