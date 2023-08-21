<script lang="ts">
  import { onDestroy } from 'svelte';
  import Dialog from './components/dialog.svelte';
  import Grid from './components/grid.svelte';
  import Heading from './components/heading.svelte';
  import Modules from './components/modules.svelte';
  import Module from './components/module.svelte';
  import Power from './modules/power.svelte';
  import Toggle from './modules/toggle.svelte';
  import { Sink } from '../objects/sinks';

  export let close: () => void;
  export let instance: Sink;

  let points = instance.getPoints();
  const onPoints = ({ count }: { count: number }) => {
    points = count;
  };
  instance.addEventListener('points', onPoints);
  onDestroy(() => (
    instance.removeEventListener('points', onPoints)
  ));

  $: formattedPoints = ('00000000' + points).slice(-8);
</script>

<Dialog close={close}>
  <Heading>Sink</Heading>
  <Grid>
    <Modules>
      <Toggle instance={instance} />
      <Power instance={instance} />
    </Modules>
    <Modules>
      <Module>
        <div slot="name">Points</div>
        <div class="points">
          {formattedPoints}
        </div>
      </Module>
    </Modules>
  </Grid>
</Dialog>

<style>
  .points {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    font-size: 3.5rem;
    line-height: 1em;
    padding: 1rem 0;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 0.5rem;
  }
</style>
