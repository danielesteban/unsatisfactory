<script lang="ts">
  import Achievements from './achievements.svelte';
  import Alerts from './alerts.svelte';
  import Research from './research.svelte';
</script>

<div class="notifications">
  <Achievements />
  <Alerts />
  <Research />
</div>

<style>
  .notifications {
    position: absolute;
    top: 1rem;
    left: 1rem;
    flex-direction: column;
    gap: 0.5rem;
    pointer-events: none;
    display: none;
    z-index: 2;
  }

  :global(body.pointerlock) .notifications, :global(body.ui) .notifications {
    display: flex;
  }
</style>
