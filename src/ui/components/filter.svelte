<script lang="ts" context="module">
  type Groups = {
    name: string;
  }[][];
</script>

<script lang="ts" generics="T extends Groups">
  export let groups: T;

  const filter = (groups: T, search: string) => {
    if (!search) {
      return groups;
    }
    search = search.toLocaleLowerCase();
    return groups.reduce<T>((groups, group) => {
      group = group.filter(({ name }) => name.toLocaleLowerCase().indexOf(search) !== -1);
      if (group.length) {
        groups.push(group);
      }
      return groups;
    }, [] as any);
  };

  let search = '';
  $: filtered = filter(groups, search);

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
</script>

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
  <slot filtered={filtered}></slot>
</div>

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
</style>
