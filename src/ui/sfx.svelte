<script lang="ts">
  import SFX from '../core/sfx';

  export let sfx: SFX;

  let isMuted = sfx.getMuted();
  const toggle = () => {
    isMuted = !sfx.getMuted();
    sfx.setMuted(isMuted);
  };
</script>

<button class="sfx" on:pointerdown={toggle}>
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

<style>
  .sfx {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: transparent;
    min-width: auto;
    height: auto;
  }

  .sfx > svg {
    fill: currentColor;
    stroke: #000;
    width: 1.5rem;
    height: 1.5rem;
    pointer-events: none;
  }

  :global(body.pointerlock) .sfx {
    display: none;
  }
</style>
