<script lang="ts">
  import { writable } from 'svelte/store';
  import Dialog from '../components/dialog.svelte';
  import Grid from '../components/grid.svelte';
  import Hand, { Hand as HandStore } from '../components/hand.svelte';
  import Heading from '../components/heading.svelte';
  import Modules from '../components/modules.svelte';
  import Crafting from '../modules/crafting.svelte';
  import Inventory from '../modules/inventory.svelte';
  import inventory from '../stores/inventory';

  export let close: () => void;

  const hand: HandStore = writable(undefined);
</script>

<Dialog close={close}>
  <Heading>Inventory</Heading>
  <Grid>
    <div class="inventory">
      <Inventory hand={hand} inventory={inventory} />
    </div>
    <Modules>
      <Crafting />
    </Modules>
  </Grid>
</Dialog>

<Hand hand={hand} inventory={inventory} />

<style>
  .inventory {
    box-sizing: border-box;
    padding: 1rem 0;
    height: 512px;
  }
</style>
