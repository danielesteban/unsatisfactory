<script lang="ts">
  import { derived } from 'svelte/store';
  import { Brush, names, subscribe } from '../core/brush';

  export let action: 'belt' | 'build' | 'configure' | 'dismantle' | 'wire' | undefined;
  export let objectBrush: Brush = Brush.none;
  export let fromBrush: Brush = Brush.none;

  $: object = objectBrush === Brush.none ? undefined : names[objectBrush];
  $: from = fromBrush === Brush.none ? undefined : names[fromBrush];

  const brush = derived([{ subscribe }], ([$brush]) => {
    if ($brush === Brush.none) {
      return undefined;
    }
    if ($brush === Brush.dismantle) {
      return 'Dismantling';
    }
    return `Building ${names[$brush]}`;
  });
</script>

<div class="cursor">
  <div class="crosshair"></div>
  {#if action}
    <div class="action">
      {#if action === 'belt'}
        Belt from <span class="object">{from || object}</span>{#if from} to <span class="object">{object}</span>{/if}
      {:else if action === 'build'}
        Press <span class="key">R</span> or <span class="key">T</span> to rotate
      {:else if action === 'configure'}
        Press <span class="key">E</span> to configure <span class="object">{object}</span>
      {:else if action === 'dismantle'}
        Dismantle <span class="object">{object}</span>
      {:else}
        Wire from <span class="object">{from || object}</span>{#if from} to <span class="object">{object}</span>{/if}
      {/if}
    </div>
  {/if}
  {#if $brush}
    <div class="brush">
      {$brush}
    </div>
  {/if}
</div>

<style>
  .cursor {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: none;
    flex-direction: column;
    align-items: center;
  }

  :global(body.pointerlock) .cursor {
    display: flex;
  }

  .crosshair {
    width: 0.5rem;
    height: 0.5rem;
    border: 0.25rem solid rgb(238, 238, 238, 0.3);
    border-radius: 0.5rem;
    box-shadow: 0 0 0.25rem rgba(0, 0, 0, 0.3);
  }

  .action, .brush {
    position: absolute;
    white-space: nowrap;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    background: rgba(0, 0, 0, .4);
    backdrop-filter: blur(0.5rem);
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .action {
    top: 100%;
    margin-top: 0.75rem;
    color: #aaa;
  }

  .brush {
    font-size: 1rem;
    bottom: 100%;
    margin-bottom: 0.75rem;
  }

  .key {
    display: inline-flex;
    width: 1rem;
    height: 1rem;
    border-radius: 0.25rem;
    background: rgba(0, 0, 0, .2);
    align-items: center;
    justify-content: center;
  }

  .key, .object {
    color: #eee;
  }
</style>
