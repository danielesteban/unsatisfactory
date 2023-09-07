<script lang="ts">
  import { readable } from 'svelte/store';

  const fps = readable(0, (set) => {
    let animation: number;
    let count = 0;
    let lastTick = performance.now() / 1000;
    const animate = () => {
      animation = requestAnimationFrame(animate);
      count++;
      const time = performance.now() / 1000;
      if (time >= lastTick + 1) {
        set(Math.round(count / (time - lastTick)));
        lastTick = time;
        count = 0;
      }
    };
    animation = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animation);
  });
</script>

{#if $fps}
  {$fps}fps
{:else}
  ···
{/if}
