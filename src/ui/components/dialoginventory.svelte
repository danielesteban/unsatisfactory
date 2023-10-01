<script lang="ts">
  import Dialog from './dialog.svelte';
  import Hand, { Hand as HandStore } from './hand.svelte';
  import Inventory from '../modules/inventory.svelte';
  import inventory from '../stores/inventory';

  export let close: () => void;
  export let hand: HandStore;
  export let onPush: ((slot: number, count: number) => void) | undefined = undefined;
</script>

<Dialog close={close}>
  <div class="grid">
    <div>
      <slot></slot>
    </div>
    <div class="inventory">
      <Inventory hand={hand} inventory={inventory} onPush={onPush} />
    </div>
  </div>
</Dialog>

<Hand hand={hand} inventory={inventory} />

<style>
  .grid {
    display: grid;
    grid-template-columns: 1fr 300px;
  }
  .inventory {
    background: rgba(0, 0, 0, .2);
    border-radius: 0 1rem 1rem 0;
    padding: 1rem 0;
    box-sizing: border-box;
  }
</style>
