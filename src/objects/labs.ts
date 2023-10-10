import RAPIER from '@dimforge/rapier3d-compat';
import {
  BoxGeometry,
  BufferAttribute,
  CylinderGeometry,
  IcosahedronGeometry,
  BufferGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ADDITION, SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
import { Connectors, ConnectorsCSG, PoweredContainer, WireConnectorCSG } from '../core/container';
import { Brush as BuildingType, Building, Consumption, Item, Researching } from '../core/data';
import Instances from '../core/instances';
import { ContainerMaterials } from '../core/materials';
import Physics from '../core/physics';
import Achievements, { Achievement } from '../ui/stores/achievements';
import Inventory from '../ui/stores/inventory';
import Research from '../ui/stores/research';

export class Lab extends PoweredContainer<
  { type: 'buffer'; }
  | { type: 'progress'; }
  | { type: 'research'; }
> {
  private static readonly bufferEvent: { type: 'buffer' } = { type: 'buffer' };
  private static readonly progressEvent: { type: 'progress' } = { type: 'progress' };
  private static readonly researchEvent: { type: 'research' } = { type: 'research' };

  private research?: typeof Researching[0];
  private buffer: Partial<Record<Item, number>>;
  private tick: number;

  constructor(connectors: Connectors, position: Vector3, rotation: number) {
    super(connectors, position, rotation, Consumption[BuildingType.lab]!);
    this.buffer = {};
    this.tick = 0;
  }

  getInputBuffer() {
    return this.buffer;
  }

  getFromInputBuffer(item: Item, count: number) {
    const c = Math.min(count, this.buffer[item]!);
    this.buffer[item]! -= c;
    this.dispatchEvent(Lab.bufferEvent);
    return c;
  }

  addToInputBuffer(item: Item, count: number) {
    const { buffer, research } = this;
    const input = research?.input.find((input) => input.item === item && buffer[item]! < input.count)
    if (!input) {
      return count;
    }
    const c = Math.min(count, input.count - buffer[item]!);
    buffer[item]! += c;
    this.dispatchEvent(Lab.bufferEvent);
    return count - c;
  }
  
  getProgress() {
    const { tick, research } = this;
    return research ? tick / (research.rate - 1) : 0;
  }

  getResearch() {
    return this.research;
  }

  setResearch(research: typeof Researching[0] | undefined) {
    this.buffer = research?.input.reduce<Lab["buffer"]>((buffer, { item }) => {
      buffer[item] = 0;
      return buffer;
    }, {}) || {};
    this.research = research;
    this.tick = 0;
    this.dispatchEvent(Lab.researchEvent);
    this.dispatchEvent(Lab.bufferEvent);
    this.dispatchEvent(Lab.progressEvent);
  }

  override dispose() {
    const { buffer, research } = this;
    if (research) {
      research.input.forEach(({ item }) => {
        const count = buffer[item]!;
        if (count > 0) {
          Inventory.input(item, count);
        }
      });
    }
  }

  override acceptsInput(item: Item) {
    const { buffer, enabled, research, tick } = this;
    return enabled && tick === 0 && !!research?.input.find((input) => input.item === item && buffer[item]! < input.count);
  }

  override canInput() {
    const { buffer, enabled, research, tick } = this;
    return (
      enabled && tick === 0 && !!research?.input.find(({ item, count }) => buffer[item]! < count)
    );
  }

  override input(item: Item) {
    const { buffer } = this;
    buffer[item]!++;
    this.dispatchEvent(Lab.bufferEvent);
  }

  process() {
    const { buffer, enabled, powered, research } = this;
    if (
      !enabled
      || !powered
      || !research
    ) {
      return false;
    }
    if (this.tick === 0) {
      if (!!research.input.find(({ item, count }) => buffer[item]! < count)) {
        return false;
      }
      research.input.forEach(({ item, count }) => {
        buffer[item]! -= count;
      });
      this.dispatchEvent(Lab.bufferEvent);
    }
    if (++this.tick < research.rate) {
      this.dispatchEvent(Lab.progressEvent);
      return false;
    }
    Achievements.complete(Achievement.research);
    Research.complete(Researching.indexOf(research));
    this.setResearch(undefined);
    return true;
  }

  setBuffer(serialized: number[]) {
    const { research } = this;
    if (!research) {
      return;
    }
    this.buffer = {};
    research.input.forEach(({ item }, i) => {
      this.buffer[item] = serialized[i] || 0;
    });
  }

  setTick(tick: number) {
    this.tick = tick;
  }

  override serialize() {
    const { buffer, research, tick } = this;
    return [
      ...super.serialize(),
      ...(research ? [
        Researching.indexOf(research),
        tick,
        research.input.map(({ item }) => buffer[item]!),
      ] : []),
    ];
  }
}

const connectors = [
  { position: new Vector3(0, -1, 1.875) },
  { position: new Vector3(0, -1, -1.875), rotation: Math.PI * -1 },
  { position: new Vector3(1.875, -1, 0), rotation: Math.PI * 0.5 },
  { position: new Vector3(-1.875, -1, 0), rotation: Math.PI * -0.5 },
];

class Labs extends Instances<Lab> {
  private static collider: RAPIER.ColliderDesc | undefined;
  static getCollider() {
    if (!Labs.collider) {
      Labs.collider = RAPIER.ColliderDesc.cylinder(2, 2);
    }
    return Labs.collider;
  }

  private static connectors: Connectors | undefined;
  static getConnectors() {
    if (!Labs.connectors) {
      Labs.connectors = new Connectors(connectors);
    }
    return Labs.connectors;
  }

  protected static override readonly cost = Building[BuildingType.lab]!;

  private static geometry: BufferGeometry | undefined;
  static getGeometry() {
    if (!Labs.geometry) {
      const csg = new Evaluator();
      const material = Labs.getMaterial();
      const uv = new Vector2();

      const base = new Brush(new CylinderGeometry(2, 2, 2), material[0]);
      base.position.set(0, -1, 0);
      base.updateMatrixWorld();
      const baseUV = base.geometry.getAttribute('uv')! as BufferAttribute;
      for (let i = 0, l = baseUV.count; i < l; i++) {
        uv.fromBufferAttribute(baseUV, i);
        baseUV.setXY(i, uv.x * 2.0, uv.y);
      }

      let dome = new Brush(new IcosahedronGeometry(2, 1), material[0]);
      const domeCut = new Brush(new BoxGeometry(8, 4, 8), material[0]);
      domeCut.position.set(0, -2, 0);
      domeCut.updateMatrixWorld();
      dome = csg.evaluate(dome, domeCut, SUBTRACTION);
      const domeUV = dome.geometry.getAttribute('uv')! as BufferAttribute;
      for (let i = 0, l = domeUV.count; i < l; i++) {
        uv.fromBufferAttribute(domeUV, i);
        domeUV.setXY(i, uv.x * 4.0, uv.y * 4.0);
      }
      const domeTop = new Brush(new CylinderGeometry(0.5, 0.5, 2), material[0]);
      domeTop.position.set(0, 1, 0);
      domeTop.updateMatrixWorld();
      dome = csg.evaluate(dome, domeTop, ADDITION);

      let brush: Brush = csg.evaluate(base, dome, ADDITION);

      brush = WireConnectorCSG(csg, brush, new Vector3(0, 2.125, 0), material[0], material[1]);
      brush = ConnectorsCSG(csg, brush, connectors, material[1]);

      Labs.geometry = mergeVertices(brush.geometry);
      Labs.geometry.computeBoundingSphere();
    }
    return Labs.geometry;
  }

  static getMaterial() {
    return ContainerMaterials;
  }

  constructor(physics: Physics) {
    super(
      {
        collider: Labs.getCollider(),
        geometry: Labs.getGeometry(),
        material: Labs.getMaterial(),
      },
      physics
    );
  }

  create(position: Vector3, rotation: number, withCost: boolean = true) {
    return super.addInstance(
      new Lab(Labs.getConnectors(), position, rotation),
      withCost
    );
  }
}

export default Labs;
