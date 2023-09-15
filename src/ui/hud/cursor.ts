// @dani
// I really tried to do this in cursor.svelte inside a <script context="module">
// But @rollup/plugin-typescript just won't cooperate.
// Exporting only seems to work for types and not enums/values.
export enum Action {
  belt = 1,
  build,
  configure,
  dismantle,
  invalid,
  unaffordable,
  wire,
  yield,
};
