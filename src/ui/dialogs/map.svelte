<script lang="ts">
  import BeaconIcon from '../components/beacon.svelte';
  import ItemImage from '../components/item.svelte';
  import Dialog from '../components/dialog.svelte';
  import Beacons from '../stores/beacons';
  import Scanner from '../stores/scanner';

  // @dani
  // I dunno is this will actually be a thing or not.
  // It'll prolly need some more polish if it actually does.
  // For now is mostly for me to debug the deposit density of the worldgen

  export let close: () => void;

  let canvas: HTMLCanvasElement;

  const width = 648;
  const height = 648;
  const scale = 4;
  
  const { altitude, offset } = Scanner.map(width, height, scale);
  const terrain = new ImageData(width, height);
  for (let i = 0, j = 0, y = 0; y < height; y++) {
    for (let x = 0; x < width; x++, i++, j+= 4) {
      let alpha = Math.min(Math.max((altitude[i] + 40) / 80, 0), 1);
      alpha = Math.floor((1 - alpha) * 255);
      terrain.data[j] = alpha * 0.25;
      terrain.data[j + 1] = alpha * 0.5;
      terrain.data[j + 2] = alpha * 0.25;
      terrain.data[j + 3] = 255;
    }
  }

  // Scanner.scan(24);

  const draw = () => {
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(pixelRatio, pixelRatio);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 0.5;

    ctx.putImageData(terrain, 0, 0);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';

    const yOffset = Math.round((height % 64) * 0.5);
    for (let y = 0; y < height; y+=64) {
      ctx.beginPath();
      ctx.moveTo(0, y + yOffset);
      ctx.lineTo(width, y + yOffset);
      ctx.stroke();
    }
    const xOffset = Math.round((width % 64) * 0.5);
    for (let x = 0; x < width; x+=64) {
      ctx.beginPath();
      ctx.moveTo(x + xOffset, 0);
      ctx.lineTo(x + xOffset, height);
      ctx.stroke();
    }
  };

  $: canvas && draw();

  $: markers = [
    ...$Beacons.map((position) => ({ item: undefined, position })),
    ...$Scanner.results,
  ].map(({ position, item }) => ({
    item,
    x: (position.x - offset.x) / scale,
    y: (position.z - offset.z) / scale,
  }));
</script>

<Dialog close={close}>
  <div class="map">
    <canvas bind:this={canvas} />
    {#each markers as { item, x, y }}
      <div class="marker" style="left: {x}px; top: {y}px;">
        <div class="image">
          {#if item !== undefined}
            <ItemImage item={item} />
          {:else}
            <BeaconIcon />
          {/if}
        </div>
      </div>
    {/each}
  </div>
</Dialog>

<style>
  .map {
    padding: 1rem;
    position: relative;
  }
  .marker {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    background: rgba(0, 0, 0, 0.15);
    border-radius: 0.25rem;
    transform: translate(-50%, 0.5rem);
  }
  .image {
    width: 1.75rem;
    height: 1.75rem;
  }
</style>
