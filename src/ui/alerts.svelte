<script lang="ts">
  import Alerts, { Alert } from './stores/alerts';
</script>

{#if $Alerts.size}
  <div class="alerts">
    {#each $Alerts as alert}
      <div class="alert">
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="17" r="1" fill="currentColor"/>
          <path d="M12 10L12 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M3.44722 18.1056L10.2111 4.57771C10.9482 3.10361 13.0518 3.10362 13.7889 4.57771L20.5528 18.1056C21.2177 19.4354 20.2507 21 18.7639 21H5.23607C3.7493 21 2.78231 19.4354 3.44722 18.1056Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div class="message">
          {#if alert === Alert.overloaded}
            <div class="heading">
              Overloaded
            </div>
            <div>
              Some machines don't have enough power
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>
{/if}

<style>
  .alerts {
    position: absolute;
    top: 1rem;
    right: 1rem;
    flex-direction: column;
    gap: 0.5rem;
    pointer-events: none;
    display: none;
  }

  :global(body.pointerlock) .alerts {
    display: flex;
  }

  .alert {
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(0.5rem);
    padding: 1rem;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }


  .alert > svg {
    fill: none;
    width: 3rem;
    height: 3rem;
  }

  .message {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .heading {
    display: flex;
    gap: 0.5rem;
    font-size: 1rem;
  }
</style>
