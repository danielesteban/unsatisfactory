import Instances from './instances';
import Transformer from './transformer';
import Belts, { Belt } from '../objects/belts';
import { Miner } from '../objects/miners';

class Simulation {
  private readonly belts: Belts;
  private readonly instances: Instances<Miner | Transformer>[];
  private static readonly rate: number = 1 / 5;
  private timer: number;

  constructor(belts: Belts, instances: Instances<Miner | Transformer>[]) {
    this.belts = belts;
    this.instances = instances;
    this.timer = 0;
  }

  step(delta: number) {
    const { belts, instances } = this;
    const { rate } = Simulation;
    this.timer += delta;
    while (this.timer > rate) {
      this.timer -= rate;
      instances.forEach((instances) => {
        const count = instances.getCount();
        for (let i = 0; i < count; i++) {
          instances.getInstance(i).process();
        }
      });
      belts.step();
    }
    Belt.setAnimationStep(this.timer / rate);
  }
}

export default Simulation;
