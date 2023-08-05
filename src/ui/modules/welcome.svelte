<script lang="ts">
  import { readable } from 'svelte/store';

  export let play: () => void;

  const GL = document.createElement('canvas').getContext('webgl');
  const ext = GL?.getExtension('WEBGL_debug_renderer_info');
  const GPU = GL && ext ? GL.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'Unknown';
  const fps = readable(0, (set) => {
    let animation: number;
    let count = 0;
    let lastTick = performance.now() / 1000;
    const animate = () => {
      animation = requestAnimationFrame(animate);
      count++;
      const time = performance.now() / 1000;
      if (time >= lastTick + 1) {
        set(Math.round(count / (time - lastTick)));
        lastTick = time;
        count = 0;
      }
    };
    animation = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animation);
  });
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
      {GPU}
    </p>
    <p>
      <span class="info">Your current framerate:</span><br />
      {$fps}fps
    </p>
  </div>
  <button on:click={play}>
    Play
  </button>
</div> 

<style>
  .welcome {
    display: grid;
    grid-template-rows: 1fr auto;
    gap: 2rem;
    padding: 1rem;
  }
  .welcome > button {
    font-size: 1rem;
    width: 100%;
    height: 2.5rem;
    background: rgba(90, 255, 90, .5);
  }
  .heading {
    font-size: 1rem;
    margin-bottom: 1rem;
  }
  .info {
    color: #aaa;
  }
</style>
