<script lang="ts">
  import { MathUtils, Vector3 } from 'three';
  import { Item, ItemName } from '../../core/data';
  import BeaconIcon from '../components/beacon.svelte';
  import ItemImage from '../components/item.svelte';
  import Beacons from '../stores/beacons';
  import Scanner from '../stores/scanner';

  export let lat: number = 0;
  export let lon: number = 0;
  export let orientation: number = 0;

  let canvas: HTMLCanvasElement;
  
  const width = 448;
  const height = 42;
  const padding = 20;
  const steps = 42;
  const step = (width - padding * 2) / steps;
  const stepDeg = 5;
  const notchDeg = 15;
  const named: any = {
    [0]: 'N',
    [45]: 'NE',
    [90]: 'E',
    [135]: 'SE',
    [180]: 'S',
    [225]: 'SW',
    [270]: 'W',
    [315]: 'NW',
  };

  const draw = (orientation: number) => {
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(pixelRatio, pixelRatio);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#eee';
    ctx.fillStyle = '#eee';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;

    {
      for (let i = 0; i < 2; i++) {
        const x = i == 0 ? 4 : width - 4;
        const y = 33;
        const d = i == 0 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y - 16);
        ctx.lineTo(x + 8 * d, y - 24);
        ctx.lineTo(x + 16 * d, y - 24);
        ctx.stroke();
      }
    }

    const deg = Math.floor(orientation / notchDeg) * notchDeg;
    const degOffset = deg - (steps * 0.5 * stepDeg);
    const offset = (deg - orientation) / notchDeg * step * 3;
    ctx.save();
    ctx.beginPath();
    ctx.rect(padding, 0, (width - padding * 2), height);
    ctx.clip();
    for (let i = 0; i <= steps + 3; i++) {
      ctx.save();
      ctx.translate(offset + padding + i * step - 1, 0);
      ctx.beginPath();
      ctx.rect(0, 8, 2, i % 3 == 0 ? 16 : 4);
      ctx.fill();
      if (i % 3 == 0) { 
        let d = Math.floor(degOffset + i * stepDeg);
        while (d < 0) d += 360;
        while (d >= 360) d -= 360;
        ctx.font = `${named[d] ? '600' : '400'} 10px 'Roboto Condensed'`;
        ctx.fillText(`${named[d] || d}`, 0, 32);
      }
      ctx.restore();
    }
    ctx.restore();

    {
      ctx.save();
      ctx.translate(width * 0.5, 0);
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(0, 12);
      ctx.lineTo(8, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  };
  
  $: canvas && draw(orientation);

  const filters: ('all' | 'beacon' | Item)[] = [
    'all',
    'beacon',
    Item.coal,
    Item.copperOre,
    Item.ironOre,
  ];
  let filter: 'all' | 'beacon' | Item = 'all';
  $: filterName = filter === 'all' ? 'All' : (filter === 'beacon' ? 'Beacon' : ItemName[filter]);

  const keydown = ({ code, repeat }: KeyboardEvent) => {
    if (code !== 'KeyZ' || repeat || !document.body.classList.contains('pointerlock')) {
      return;
    }
    filter = filters[(filters.indexOf(filter) + 1) % filters.length]!;
  };

  const getDistanceToMarker = (position: Vector3, lat: number, lon: number) => (
    Math.round(Math.sqrt((lon - position.x) ** 2 + (lat - position.z) ** 2))
  );

  const getMarkerPosition = (position: Vector3, lat: number, lon: number, orientation: number) => {
    let angle = Math.atan2(lon - position.x, lat - position.z);
    angle = Math.PI * 2 - (angle - Math.floor(angle/(Math.PI * 2)) * Math.PI * 2);
    angle = Math.floor(angle / Math.PI * 18000) / 100;
    const diff = Math.abs((angle - 360) - orientation) > Math.abs(angle - orientation) ? (angle - orientation) : ((angle - 360) - orientation);
    const offset = diff / stepDeg * step;
    return MathUtils.clamp(width * 0.5 + offset, 0, width);
  };

  $: markers = [
    ...((filter === 'all' || filter === 'beacon') ? $Beacons.map((position) => ({
      item: undefined,
      distance: getDistanceToMarker(position, lat, lon),
      position: getMarkerPosition(position, lat, lon, orientation),
    })) : []),
    ...(filter !== 'beacon' ? (
      $Scanner.results
        .filter(({ item }) => filter === 'all' || filter === item)
        .map(({ item, position }) => ({
          item,
          distance: getDistanceToMarker(position, lat, lon),
          position: getMarkerPosition(position, lat, lon, orientation),
        }))
    ) : []),
  ].sort(({ distance: a }, { distance: b }) => b - a);
</script>

<svelte:document on:keydown={keydown} />

<div class="compass">
  <div class="info">
    <div>{`${Math.abs(lat / 1000).toFixed(2)}° ${lat < 0 ? 'N' : 'S'}`}</div>
    <div>{`${Math.abs(lon / 1000).toFixed(2)}° ${lon < 0 ? 'W' : 'E'}`}</div>
  </div>
  <div>
    <canvas bind:this={canvas} />
    <div class="scanner">
      {#each markers as { item, position, distance }}
        <div class="marker" style="left: {position}px">
          <div class="box">
            <div class="image">
              {#if item !== undefined}
                <ItemImage item={item} />
              {:else}
                <BeaconIcon />
              {/if}
            </div>
            <div class="distance">
              {distance}m
            </div>
          </div>
        </div>
      {/each}
      {#if $Scanner.isRunning}<div class="progress" style="width:{$Scanner.progress * width}px"></div>{/if}
    </div>
  </div>
  <div class="info keys">
    <div>
      <div>
        <div class="key">Z</div>
        <div>Filter: {filterName}</div>
      </div>
      <div>
        <div class="key">X</div>
        <div>Scan</div>
      </div>
    </div>
  </div>
</div>

<style>
  .compass {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translate(-50%, 0);
    background: rgba(0, 0, 0, 0.15);
    backdrop-filter: blur(0.5rem);
    border-radius: 0 0 0.5rem 0.5rem;
    align-items: center;
    pointer-events: none;
    display: none;
  }

  :global(body.pointerlock) .compass {
    display: flex;
  }

  .info {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 6rem;
    height: 2.625rem;
    font-size: 0.625rem;
    line-height: 1rem;
  }

  .keys > div > div {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .key {
    display: inline-flex;
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 0.25rem;
    background: rgba(0, 0, 0, 0.075);
    align-items: center;
    justify-content: center;
    color: #eee;
    font-size: 0.5625rem;
  }

  .scanner {
    position: relative;
  }

  .progress {
    position: absolute;
    left: 50%;
    top: 0;
    height: 0.25rem;
    transform: translate(-50%, -50%);
    background: rgba(90, 255, 90, 0.5);
  }

  .marker {
    position: absolute;
  }
  
  .marker::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    background: rgba(0, 0, 0, 0.1);
    width: 2px;
    height: 0.5rem;
    transform: translate(-50%, 0);
  }

  .box {
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

  .distance {
    margin-top: -0.5rem;
    font-size: 0.625rem;
    color: #eee;
  }

  .image {
    width: 1.75rem;
    height: 1.75rem;
  }
</style>
