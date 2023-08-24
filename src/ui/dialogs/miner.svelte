<script lang="ts">
  import { Miner } from '../../objects/miners';
  import Dialog from '../components/dialog.svelte';
  import Grid from '../components/grid.svelte';
  import Heading from '../components/heading.svelte';
  import Modules from '../components/modules.svelte';
  import Power from '../modules/power.svelte';
  import Production from '../modules/production.svelte';
  import Toggle from '../modules/toggle.svelte';

  export let close: () => void;
  export let instance: Miner;

  let item = { item: instance.getItem(), count: 1 };
  let rate = instance.getRate();
</script>

<Dialog close={close}>
  <Heading>Miner</Heading>
  <Grid>
    <Modules>
      <Toggle instance={instance} />
      <Power instance={instance} />
    </Modules>
    <Modules>
      <Production
        name="Production"
        items={item}
        rate={rate}
      />
    </Modules>
  </Grid>
</Dialog>
