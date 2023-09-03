<script lang="ts">
  import { writable } from 'svelte/store';
  import { Storage } from '../../objects/storages';
  import Dialog from '../components/dialog.svelte';
  import Hand, { Hand as HandStore } from '../components/hand.svelte';
  import Heading from '../components/heading.svelte';
  import Inventory from '../modules/inventory.svelte';
  import inventory from '../stores/inventory';

  export let close: () => void;
  export let instance: Storage;

  const hand: HandStore = writable(undefined);
  const container = instance.getInventory();
  
  const push = (slot: number, count: number, from: typeof inventory, to: typeof inventory) => {
    const { item } = from.getSlot(slot);
    const remaining = to.input(item, count);
    from.getFromSlot(slot, count - remaining);
  };
  const onContainerPush = (slot: number, count: number) => (
    push(slot, count, container, inventory)
  );
  const onInventoryPush = (slot: number, count: number) => (
    push(slot, count, inventory, container)
  );
</script>

<Dialog close={close}>
  <div class="grid">
    <div>
      <Heading>Storage</Heading>
      <div class="container">
        <Inventory hand={hand} inventory={container} onPush={onContainerPush} />
      </div>
    </div>
    <div class="inventory">
      <Inventory hand={hand} inventory={inventory} onPush={onInventoryPush} />
    </div>
  </div>
</Dialog>

<Hand hand={hand} inventory={inventory} />

<style>
  .grid {
    display: grid;
    grid-template-columns: 1fr 300px;
  }
  .container {
    padding: 1rem 0;
  }
  .inventory {
    background: rgba(0, 0, 0, .2);
    border-radius: 0 1rem 1rem 0;
    padding: 1rem 0;
    box-sizing: border-box;
  }
</style>
