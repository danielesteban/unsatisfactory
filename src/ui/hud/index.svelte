<script lang="ts">
  import { ComponentProps } from 'svelte';
  import Loader from '../../core/loader';
  import Actions from './actions.svelte';
  import Autosave from './autosave.svelte';
  import Compass from './compass.svelte';
  import Cursor from './cursor.svelte';
  import Hotbar from './hotbar.svelte';
  import Notifications from './notifications.svelte';

  export let compass: ComponentProps<Compass> = {} as any;
  export let cursor: ComponentProps<Cursor> = {} as any;
  export let loader: Loader;
  export let settings: () => void;
</script>

<Cursor {...cursor} />
<Compass {...compass} />
<Hotbar />
<Notifications />
<Autosave loader={loader} />
<Actions loader={loader} settings={settings} />
