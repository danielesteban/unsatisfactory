<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Generator } from '../../objects/generators';
  import Dialog from '../components/dialog.svelte';
  import Grid from '../components/grid.svelte';
  import Heading from '../components/heading.svelte';
  import Modules from '../components/modules.svelte';
  import Module from '../components/module.svelte';
  import Toggle from '../modules/toggle.svelte';

  export let close: () => void;
  export let instance: Generator;

  let available = instance.getAvailable();
  let efficiency = instance.getEfficiency();
  let power = instance.getPower();
  const onAvailable = ({ power }: { power: number }) => {
    available = power;
  };
  const onEfficiency = ({ scale }: { scale: number }) => {
    efficiency = scale;
    power = instance.getPower();
  };
  const onEnabled = () => {
    power = instance.getPower();
  };
  instance.addEventListener('available', onAvailable);
  instance.addEventListener('efficiency', onEfficiency);
  instance.addEventListener('enabled', onEnabled);
  onDestroy(() => {
    instance.removeEventListener('available', onAvailable);
    instance.removeEventListener('efficiency', onEfficiency);
    instance.removeEventListener('enabled', onEnabled);
  });
</script>

<Dialog close={close}>
  <Heading>Generator</Heading>
  <Grid>
    <Modules>
      <Toggle instance={instance} />
    </Modules>
    <Modules>
      <Module>
        <div slot="name">Efficiency</div>
        <div>
          <span class="power">{Math.floor(efficiency * 100)}</span> %
        </div>
      </Module>
      <Module>
        <div slot="name">Generated power</div>
        <div>
          <span class="power">{power}</span> MW
        </div>
      </Module>
      <Module>
        <div slot="name">Unused power</div>
        <div>
          <span class="power">{available}</span> MW
        </div>
      </Module>
    </Modules>
  </Grid>
</Dialog>

<style>
  .power {
    font-weight: 600;
  }
</style>
