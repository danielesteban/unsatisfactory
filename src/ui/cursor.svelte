<script lang="ts">
  export let action: 'belt' | 'build' | 'configure' | 'wire' | undefined;
  export let object: string | undefined;
  export let from: string | undefined;
</script>

<div class="cursor">
  <div class="crosshair"></div>
  {#if action}
    <div class="tooltip">
      {#if action === 'belt'}
        Belt from <span class="object">{from || object}</span>{#if from} to <span class="object">{object}</span>{/if}
      {:else if action === 'build'}
        Press <span class="key">R</span> or <span class="key">T</span> to rotate
      {:else if action === 'configure'}
        Press <span class="key">E</span> to configure <span class="object">{object}</span>
      {:else}
        Wire from <span class="object">{from || object}</span>{#if from} to <span class="object">{object}</span>{/if}
      {/if}
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

  .tooltip {
    position: absolute;
    top: 100%;
    margin-top: 0.75rem;
    white-space: nowrap;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    background: rgba(0, 0, 0, .4);
    backdrop-filter: blur(0.5rem);
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: #aaa;
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

  .crosshair {
    width: 0.5rem;
    height: 0.5rem;
    border: 0.25rem solid rgb(238, 238, 238, 0.3);
    border-radius: 0.5rem;
    box-shadow: 0 0 0.25rem rgba(0, 0, 0, 0.3);
  }
</style>
