<script lang="ts">
  import Dialog from './components/dialog.svelte';
  import Heading from './components/heading.svelte';
  import Modules from './components/modules.svelte';
  import Power from './components/power.svelte';
  import { Miner } from '../objects/miners';

  export let close: () => void;
  export let instance: Miner;
</script>

<Dialog close={close}>
  <Heading>Miner</Heading>
  <Modules>
    <Power instance={instance} />
  </Modules>
</Dialog>
