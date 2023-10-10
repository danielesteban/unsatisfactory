<script lang="ts">
  export let value: number;
</script>

<div class="progress">
  <div style="width: {Math.round(value * 100)}%" />
</div>

<style>
  .progress {
    background: rgba(0, 0, 0, .2);
    width: 100%;
    height: 0.5rem;
    border-radius: 0.5rem;
  }
  .progress > div {
    background: rgba(90, 255, 90, 0.5);
    height: 0.5rem;
    border-radius: 0.5rem;
  }
</style>
