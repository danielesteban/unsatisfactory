<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let hasClicked = false;
  let timer = 0;
  const click = () => {
    dispatch('click');
    clearTimeout(timer);
    hasClicked = true;
    timer = setTimeout(() => {
      hasClicked = false;
    }, 1000);
  };
</script>

<slot click={click} hasClicked={hasClicked} />
