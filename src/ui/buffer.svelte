<script lang="ts">
  import Dialog from './components/dialog.svelte';
  import Heading from './components/heading.svelte';
  import Modules from './components/modules.svelte';
  import Module from './components/module.svelte';
  import { Buffer } from '../objects/buffers';

  export let close: () => void;
  export let instance: Buffer;

  let enabled = instance.isSink();
  const toggle = () => {
    enabled = !instance.isSink();
    instance.setSink(enabled);
  };
</script>

<Dialog close={close}>
  <Heading>Buffer</Heading>
  <Modules>
    <Module>
      <div slot="name">Sink</div>
      <div>
        <button on:click={toggle} class:enabled={enabled}>
          {enabled ? 'ON' : 'OFF'}
        </button>
      </div>
    </Module>
  </Modules>
</Dialog>

<style>
  .enabled {
    background: rgba(255, 255, 90, .5);
  }
</style>
