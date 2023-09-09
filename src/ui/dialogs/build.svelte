<script lang="ts">
  import { onDestroy } from 'svelte';
  import { set as setBrush } from '../../core/brush';
  import { Brush, BrushName, BrushGroups, BrushTier } from '../../core/data';
  import BrushImage from '../components/brush.svelte';
  import Dialog from '../components/dialog.svelte';
  import Filter from '../components/filter.svelte';
  import Achievements, { Achievement } from '../stores/achievements';
  import Hotbar from '../stores/hotbar';

  export let close: () => void;

  const set = (brush: Brush) => () => {
    setBrush(brush);
    close();
  };

  const brushes = BrushGroups.map((group) => (
    group.map((brush) => ({ id: brush, name: BrushName[brush] }))
  ));

  $: tier = $Achievements.has(Achievement.points) ? 1 : 0;
  $: brushesInTier = brushes.map((group) => (
    group.map((brush) => ({ ...brush, locked: tier < (BrushTier[brush.id] || 0)}))
  ));

  let hover: Brush | undefined;
  const setHover = (brush: Brush | undefined) => ({ target }: PointerEvent) => {
    if ((target as HTMLButtonElement).disabled) {
      return;
    }
    hover = brush;
  };
  const keydown = ({ code, repeat, target }: KeyboardEvent) => {
    if (!hover || !code || code.length !== 6 || code.slice(0, 5) !== 'Digit' || repeat || (target as HTMLElement).tagName.toLowerCase() === 'input') {
      return;
    }
    const digit = parseInt(code.slice(5), 10);
    const slot = digit === 0 ? 9 : (digit - 1);
    Hotbar.toggle(hover, slot);
  };

  document.body.classList.add('hotbar');
  onDestroy(() => document.body.classList.remove('hotbar'));
</script>

<svelte:document on:keydown={keydown} />

<Dialog close={close}>
  <Filter groups={brushesInTier} let:filtered>
    <div class="grid">
      {#each filtered as group}
        <div class="group">
          {#each group as brush (brush.id)}
            <button
              class="brush"
              disabled={brush.locked}
              on:click={set(brush.id)}
              on:pointerenter={setHover(brush.id)}
              on:pointerleave={setHover(undefined)}
            >
              <BrushImage brush={brush.id} multiple let:images>
                {#each images as image}
                  <!-- svelte-ignore a11y-missing-attribute -->
                  <img src={image} />
                {/each}
              </BrushImage>
              <span class="name">{brush.name}</span>
              {#if brush.locked}
                <span class="locked">
                  <svg viewBox="0 0 24 24">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M5.25 10.0546V8C5.25 4.27208 8.27208 1.25 12 1.25C15.7279 1.25 18.75 4.27208 18.75 8V10.0546C19.8648 10.1379 20.5907 10.348 21.1213 10.8787C22 11.7574 22 13.1716 22 16C22 18.8284 22 20.2426 21.1213 21.1213C20.2426 22 18.8284 22 16 22H8C5.17157 22 3.75736 22 2.87868 21.1213C2 20.2426 2 18.8284 2 16C2 13.1716 2 11.7574 2.87868 10.8787C3.40931 10.348 4.13525 10.1379 5.25 10.0546ZM6.75 8C6.75 5.10051 9.10051 2.75 12 2.75C14.8995 2.75 17.25 5.10051 17.25 8V10.0036C16.867 10 16.4515 10 16 10H8C7.54849 10 7.13301 10 6.75 10.0036V8ZM12 13.25C12.4142 13.25 12.75 13.5858 12.75 14V18C12.75 18.4142 12.4142 18.75 12 18.75C11.5858 18.75 11.25 18.4142 11.25 18V14C11.25 13.5858 11.5858 13.25 12 13.25Z"/>
                  </svg>
                </span>
              {/if}
            </button>
          {/each}
        </div>
      {/each}
    </div>
  </Filter>
</Dialog>

<style>
  .grid {
    box-sizing: border-box;
    padding: 1rem;
    height: 480px;
    display: grid;
    align-content: start;
    gap: 0.5rem;
    overflow-y: overlay;
  }
  .group {
    display: grid;
    grid-template-columns: repeat(auto-fill, 7.5625rem);
    gap: 0.5rem;
  }
  .brush {
    position: relative;
    width: 7.5625rem;
    height: 7.5625rem;
    background: rgba(0, 0, 0, .2);
  }
  .brush:disabled {
    opacity: 0.3;
    cursor: default;
  }
  .brush > img {
    position: absolute;
    width: 5.5rem;
    height: 5.5rem;
    top: 1.03125rem;
    left: 1.03125rem;
    pointer-events: none;
  }
  .brush > img:nth-child(2) {
    display: none;
  }
  .brush:hover > img:nth-child(1) {
    display: none;
  }
  .brush:hover > img:nth-child(2) {
    display: block;
  }
  .brush:disabled:hover > img:nth-child(1) {
    display: block;
  }
  .brush:disabled:hover > img:nth-child(2) {
    display: none;
  }
  .brush .name {
    position: absolute;
    left: 0;
    bottom: 0.5rem;
    width: 100%;
    display: block;
    text-align: center;
    color: #aaa;
    white-space: nowrap;
  }
  .brush:hover .name {
    color: #eee;
  }
  .brush:disabled:hover .name {
    color: #aaa;
  }
  .locked {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    backdrop-filter: blur(0.5rem);
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
  }
  .locked > svg {
    fill: currentColor;
    width: 3rem;
    height: 3rem;
    pointer-events: none;
  }
</style>
