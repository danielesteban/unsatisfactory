<script lang="ts">
  import { writable } from 'svelte/store';
  import { Storage } from '../../objects/storages';
  import DialogWithInventory from '../components/dialoginventory.svelte';
  import { Hand } from '../components/hand.svelte';
  import Heading from '../components/heading.svelte';
  import Inventory from '../modules/inventory.svelte';
  import inventory from '../stores/inventory';

  export let close: () => void;
  export let instance: Storage;

  const container = instance.getInventory();
  const hand: Hand = writable(undefined);

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

<DialogWithInventory close={close} hand={hand} onPush={onInventoryPush}>
  <Heading>Storage</Heading>
  <div class="storage">
    <Inventory hand={hand} inventory={container} onPush={onContainerPush} />
  </div>
</DialogWithInventory>

<style>
  .storage {
    padding: 1rem 0;
  }
</style>
