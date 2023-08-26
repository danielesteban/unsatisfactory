<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Brush, names, groups, set as setBrush } from '../../core/brush';
  import Hotbar from '../stores/hotbar';
  import Dialog from '../components/dialog.svelte';
  import { captureBrush } from '../capture';

  export let close: () => void;

  const set = (brush: Brush) => () => {
    setBrush(brush);
    close();
  };

  const brushes = groups.map((group) => (
    group.map((brush) => ({ id: brush, name: names[brush], images: captureBrush(brush) }))
  ));

  const filter = (search: string) => {
    if (!search) {
      return brushes;
    }
    search = search.toLocaleLowerCase();
    return brushes.reduce<{ id: Brush, name: string, images: Promise<string[]> }[][]>((groups, group) => {
      group = group.filter(({ name }) => name.toLocaleLowerCase().indexOf(search) !== -1);
      if (group.length) {
        groups.push(group);
      }
      return groups;
    }, []);
  };

  let search = '';
  $: filteredBrushes = filter(search);

  $: result = (() => {
    let result = undefined;
    if (search.trim() && !/[a-z]/i.test(search)) {
      try {
        result = (new Function(`return parseFloat(${search});`))();
      } catch (e) {
        result = undefined;
      }
    }
    return result;
  })();

  let hover: Brush | undefined;
  const setHover = (brush: Brush | undefined) => () => {
    hover = brush;
  };
  const keydown = ({ code, repeat, target }: KeyboardEvent) => {
    if (!hover || code.length !== 6 || code.slice(0, 5) !== 'Digit' || repeat || (target as HTMLElement).tagName.toLowerCase() === 'input') {
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
  <div class="search">
    <input
      type="text"
      class="input"
      placeholder="Search..."
      bind:value={search}
    />
    {#if result}
      <div class="result">
        {result}
      </div>
    {/if}
  </div>
  <div class="wrapper">
    <div class="grid">
      {#each filteredBrushes as group}
        <div class="group">
          {#each group as brush (brush.id)}
            <button
              class="brush"
              on:click={set(brush.id)}
              on:pointerenter={setHover(brush.id)}
              on:pointerleave={setHover(undefined)}
            >
              {#await brush.images then images}
                {#each images as image}
                  <!-- svelte-ignore a11y-missing-attribute -->
                  <img src={image} />
                {/each}
              {/await}
              <span>{brush.name}</span>
            </button>
          {/each}
        </div>
      {/each}
    </div>
  </div>
</Dialog>

<style>
  .search {
    position: relative;
    font-size: 1.375rem;
    line-height: 1em;
  }
  .search .input {
    box-sizing: border-box;
    border: 0;
    margin: 0;
    padding: 1rem;
    outline: 0;
    color: inherit;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    background: transparent;
    width: 100%;
    border-bottom: 2px solid rgba(255, 255, 255, 0.05);
  }
  .search .input::placeholder {
    color: #aaa;
  }
  .result {
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translate(0, -50%);
    color: #aaa;
  }
  .wrapper {
    border-radius: 0 0 1rem 1rem;
    overflow: hidden;
  }
  .grid {
    display: grid;
    align-content: start;
    padding: 1rem;
    gap: 0.5rem;
    overflow-y: overlay;
    height: 460px;
  }
  .group {
    display: grid;
    grid-template-columns: repeat(auto-fill, 8.375rem);
    gap: 0.5rem;
  }
  .brush {
    position: relative;
    width: 8.375rem;
    height: 8.375rem;
    background: rgba(0, 0, 0, .2);
  }
  .brush > img {
    position: absolute;
    width: 6rem;
    height: 6rem;
    top: 1.1875rem;
    left: 1.1875rem;
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
  .brush > span {
    position: absolute;
    left: 0;
    bottom: 0.5rem;
    width: 100%;
    display: block;
    text-align: center;
  }
</style>
