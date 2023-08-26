import { writable } from 'svelte/store';

export enum Alert {
  overloaded,
}

const alerts: Set<Alert> = new Set();
const { subscribe, set } = writable<Set<Alert>>(alerts);

export default {
  subscribe,
  set(alert: Alert, enabled: boolean) {
    if (enabled) {
      if (alerts.has(alert)) {
        return;
      }
      alerts.add(alert);
    } else {
      if (!alerts.has(alert)) {
        return;
      }
      alerts.delete(alert);
    }
    set(alerts);
  },
};
