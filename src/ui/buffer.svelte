<script lang="ts" context="module">
  import { tap } from '../sounds';
  const sfx = new Audio(tap);
  sfx.volume = 0.2;
</script>

<script lang="ts">
  import { onDestroy } from 'svelte';
  import Dialog from './components/dialog.svelte';
  import Heading from './components/heading.svelte';
  import Modules from './components/modules.svelte';
  import Module from './components/module.svelte';
  import { Buffer, BufferEvent } from '../objects/buffers';

  export let close: () => void;
  export let instance: Buffer;

  const toggle = () => {
    instance.setSink(!instance.isSink());
    !localStorage.getItem('sfx:muted') && sfx.paused && sfx.play();
  };

  let sink = instance.isSink();
  const onSink = ({ status }: BufferEvent) => {
    sink = status;
  };
  instance.addEventListener('sink', onSink);
  onDestroy(() => (
    instance.removeEventListener('sink', onSink)
  ));
</script>

<Dialog close={close}>
  <Heading>Buffer</Heading>
  <Modules>
    <Module>
      <div slot="name">Sink</div>
      <div>
        <button on:click={toggle} class:enabled={sink}>
          {sink ? 'ON' : 'OFF'}
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
