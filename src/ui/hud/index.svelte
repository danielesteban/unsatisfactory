<script lang="ts">
  import { ComponentProps } from 'svelte';
  import Loader from '../../core/loader';
  import Achievements from './achievements.svelte';
  import Actions from './actions.svelte';
  import Alerts from './alerts.svelte';
  import Autosave from './autosave.svelte';
  import Compass from './compass.svelte';
  import Cursor from './cursor.svelte';
  import Hotbar from './hotbar.svelte';

  export let compass: ComponentProps<Compass> = {} as any;
  export let cursor: ComponentProps<Cursor> = {} as any;
  export let loader: Loader;
  export let settings: () => void;
</script>

<Cursor {...cursor} />
<Compass {...compass} />
<Hotbar />
<Achievements />
<Alerts />
<Autosave loader={loader} />
<Actions loader={loader} settings={settings} />
