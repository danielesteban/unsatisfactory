import {
  BaseEvent,
  Vector3,
} from 'three';
import { Connectors, PoweredContainer } from './container';

type GeneratorEvents = (
  { type: 'available'; }
  | { type: 'generating'; }
);

class Generator<Events extends BaseEvent = BaseEvent> extends PoweredContainer<
  GeneratorEvents | Events
> {
  private static readonly availableEvent: { type: 'available' } = { type: 'available' };
  private static readonly generatingEvent: { type: 'generating' } = { type: 'generating' };

  protected available: number;
  protected generating: boolean;
  protected readonly power: number;

  constructor(connectors: Connectors, position: Vector3, rotation: number, power: number = 100) {
    super(connectors, position, rotation, 0, 4);
    this.available = power;
    this.generating = true;
    this.power = power;
  }

  getAvailable() {
    return this.enabled && this.generating ? this.available : 0;
  }

  setAvailable(power: number) {
    this.available = power;
    this.dispatchEvent(Generator.availableEvent);
  }

  isGenerating() {
    return this.generating;
  }

  setGenerating(status: boolean) {
    this.generating = status;
    this.dispatchEvent(Generator.generatingEvent);
  }

  getPower() {
    return this.enabled && this.generating ? Math.floor(this.power) : 0;
  }
}

export default Generator;
