import Container from './container';
import Instances from './instances';
import Transformer from './transformer';
import Belts, { Belt } from '../objects/belts';
import { Miner } from '../objects/miners';

class Simulation {
  public static readonly tps: number = 5;
  private static readonly rate: number = 1 / Simulation.tps;

  private readonly belts: Belts;
  private readonly containers: Instances<Container>[];
  private timer: number;

  constructor(belts: Belts, containers: Instances<Container>[]) {
    this.belts = belts;
    this.containers = containers;
    this.timer = 0;
  }

  step(delta: number) {
    const { belts, containers } = this;
    const { rate } = Simulation;
    this.timer += delta;
    while (this.timer > rate) {
      this.timer -= rate;
      containers.forEach((instances) => {
        const count = instances.getCount();
        for (let i = 0; i < count; i++) {
          const instance = instances.getInstance(i);
          instance.stepInput();
          if (instance instanceof Miner || instance instanceof Transformer) {
            instance.process();
          }
        }
      });
      belts.step();
      containers.forEach((instances) => {
        const count = instances.getCount();
        for (let i = 0; i < count; i++) {
          instances.getInstance(i).stepOutput();
        }
      });
    }
    Belt.setAnimationStep(this.timer / rate);
  }
}

export default Simulation;
