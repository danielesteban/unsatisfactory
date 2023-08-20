<script lang="ts">
  import Dialog from './components/dialog.svelte';
  import Heading from './components/heading.svelte';
  import Modules from './components/modules.svelte';
  import Power from './modules/power.svelte';
  import Toggle from './modules/toggle.svelte';
  import { Sink } from '../objects/sinks';

  export let close: () => void;
  export let instance: Sink;
</script>

<Dialog close={close}>
  <Heading>Sink</Heading>
  <Modules>
    <Toggle instance={instance} />
    <Power instance={instance} />
  </Modules>
</Dialog>
