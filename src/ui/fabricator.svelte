<script lang="ts">
  import Dialog from './components/dialog.svelte';
  import Heading from './components/heading.svelte';
  import Modules from './components/modules.svelte';
  import Power from './modules/power.svelte';
  import Toggle from './modules/toggle.svelte';
  import { Fabricator } from '../objects/fabricators';

  export let close: () => void;
  export let instance: Fabricator;
</script>

<Dialog close={close}>
  <Heading>Fabricator</Heading>
  <Modules>
    <Toggle instance={instance} />
    <Power instance={instance} />
  </Modules>
</Dialog>
