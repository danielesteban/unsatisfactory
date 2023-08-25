import { writable } from 'svelte/store';

export enum Alert {
  none,
  overloaded,
}

let current = Alert.none;
const { subscribe, set } = writable<Alert>(current);

export default {
  subscribe,
  set(alert: Alert, enabled: boolean) {
    if (
      (enabled && current === alert)
      || (!enabled && current !== alert)
    ) {
      return;
    }
    current = enabled ? alert : Alert.none;
    set(current);
  },
};
