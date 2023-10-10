import { writable } from 'svelte/store';
import { Vector3 } from 'three';
import Instances, { Instance } from '../../core/instances';

const { subscribe, set } = writable<Vector3[]>([]);

export default {
  subscribe,
  connect(beacons: Instances<Instance>) {
    const update = () => {
      const count = beacons.getCount();
      const positions = [];
      for (let i = 0; i < count; i++) {
        positions.push(beacons.getInstance(i).position);
      }
      set(positions);
    };
    update();
    beacons.addEventListener('addInstance', update);
    beacons.addEventListener('removeInstance', update);
  },
};
