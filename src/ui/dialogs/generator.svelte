<script lang="ts">
  import { onDestroy } from 'svelte';
  import { writable } from 'svelte/store';
  import { Item } from '../../core/data';
  import { Generator } from '../../objects/generators';
  import DialogWithInventory from '../components/dialoginventory.svelte';
  import Grid from '../components/grid.svelte';
  import { Hand } from '../components/hand.svelte';
  import Heading from '../components/heading.svelte';
  import Modules from '../components/modules.svelte';
  import Module from '../components/module.svelte';
  import Production from '../modules/production.svelte';
  import Progress from '../modules/progress.svelte';
  import Toggle from '../modules/toggle.svelte';
  import Inventory from '../stores/inventory';

  export let close: () => void;
  export let instance: Generator;

  const hand: Hand = writable(undefined);
  const onInput = (item: Exclude<Item, Item.none>) => ({ button, isPrimary, shiftKey }: PointerEvent) => {
    if (!isPrimary) {
      return;
    }
    if ($hand) {
      const { item: handItem, count, slot: from } = $hand;
      if (handItem !== item) {
        return;
      }
      const amount = button === 2 ? 1 : count;
      let remaining = count - amount;
      remaining += instance.addToInputBuffer(amount);
      $hand = remaining > 0 ? { item, count: remaining, slot: from } : undefined;
      return;
    }
    const count = instance.getInputBuffer();
    if (!count) {
      return;
    }
    const amount = button === 2 ? Math.ceil(count / 2) : count;
    if (shiftKey) {
      Inventory.input(item, instance.getFromInputBuffer(amount));
    } else {
      $hand = { item, count: instance.getFromInputBuffer(amount), slot: 0 };
    }
  };
  const onPush = (slot: number, count: number) => {
    const { item } = Inventory.getSlot(slot);
    if (item !== instance.getItem()) {
      return;
    }
    const remaining = instance.addToInputBuffer(count);
    Inventory.getFromSlot(slot, count - remaining);
  };

  let available = instance.getAvailable();
  let power = instance.getPower();
  const onAvailable = () => {
    available = instance.getAvailable();
  };
  const onEnabled = () => {
    available = instance.getAvailable();
    power = instance.getPower();
  };
  instance.addEventListener('available', onAvailable);
  instance.addEventListener('enabled', onEnabled);

  let input = {
    item: instance.getItem(),
    count: instance.getCount(),
    buffer: instance.getInputBuffer(),
  };
  let rate = instance.getRate();
  const onBuffer = () => {
    input = { ...input, buffer: instance.getInputBuffer() };
  };
  instance.addEventListener('buffer', onBuffer);

  onDestroy(() => {
    instance.removeEventListener('available', onAvailable);
    instance.removeEventListener('enabled', onEnabled);
  });
</script>

<DialogWithInventory close={close} hand={hand} onPush={onPush}>
  <Heading>Power Plant</Heading>
  <Grid>
    <Modules>
      <Toggle instance={instance} />
      <Progress instance={instance} />
      <Module>
        <div slot="name">Generated Power</div>
        <div>
          <span class="power">{power}</span> MW
        </div>
      </Module>
      <Module>
        <div slot="name">Unused Power</div>
        <div>
          <span class="power">{available}</span> MW
        </div>
      </Module>
    </Modules>
    <Modules>
      <Production
        name="Input"
        items={input}
        rate={rate}
        onBuffer={onInput}
      />
    </Modules>
  </Grid>
</DialogWithInventory>

<style>
  .power {
    font-weight: 600;
  }
</style>
