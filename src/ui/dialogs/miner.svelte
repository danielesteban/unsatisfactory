<script lang="ts">
  import { onDestroy } from 'svelte';
  import { writable } from 'svelte/store';
  import { Item } from '../../core/data';
  import { Miner } from '../../objects/miners';
  import DialogWithInventory from '../components/dialoginventory.svelte';
  import Grid from '../components/grid.svelte';
  import { Hand } from '../components/hand.svelte';
  import Heading from '../components/heading.svelte';
  import Modules from '../components/modules.svelte';
  import Power from '../modules/power.svelte';
  import Production from '../modules/production.svelte';
  import Progress from '../modules/progress.svelte';
  import Toggle from '../modules/toggle.svelte';
  import Inventory from '../stores/inventory';

  export let close: () => void;
  export let instance: Miner;

  const hand: Hand = writable(undefined);
  const onOutput = (item: Exclude<Item, Item.none>) => ({ button, isPrimary, shiftKey }: PointerEvent) => {
    if (!isPrimary || $hand) {
      return;
    }
    const count = instance.getOutputBuffer();
    if (!count) {
      return;
    }
    const amount = button === 2 ? Math.ceil(count / 2) : count;
    if (shiftKey) {
      Inventory.input(item, instance.getFromOutputBuffer(amount));
    } else {
      $hand = { item, count: instance.getFromOutputBuffer(amount), slot: 0 };
    }
  };

  let output = {
    item: instance.getItem(),
    count: instance.getCount(),
    buffer: instance.getOutputBuffer(),
  };
  let rate = instance.getRate();
  const onBuffer = () => {
    output = { ...output, buffer: instance.getOutputBuffer() };
  };
  instance.addEventListener('buffer', onBuffer);
  onDestroy(() => {
    instance.addEventListener('buffer', onBuffer);
  });
</script>

<DialogWithInventory close={close} hand={hand}>
  <Heading>Miner</Heading>
  <Grid>
    <Modules>
      <Toggle instance={instance} />
      <Progress instance={instance} />
      <Power instance={instance} />
    </Modules>
    <Modules>
      <Production
        name="Output"
        items={output}
        rate={rate}
        onBuffer={onOutput}
      />
    </Modules>
  </Grid>
</DialogWithInventory>
