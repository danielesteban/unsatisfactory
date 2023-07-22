import { SvelteComponent } from 'svelte';
import Fabricator from './fabricator.svelte';

let current: SvelteComponent | undefined = undefined;
const target = document.getElementById('ui')!;
const viewport = document.getElementById('viewport')!;

export default (type: 'Fabricator', props: any) => {
  document.exitPointerLock();
  if (current) {
    current.$destroy();
  }
  let dialog: SvelteComponent;
  const params = {
    props: {
      ...props,
      close: () => {
        dialog.$destroy();
        viewport.requestPointerLock();
      },
    },
    target,
  };
  switch (type) {
    case 'Fabricator':
      dialog = new Fabricator(params);
      break;
  }
  current = dialog;
  return dialog;
};
