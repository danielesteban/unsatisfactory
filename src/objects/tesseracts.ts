import { nanoid } from 'nanoid';
import RAPIER from '@dimforge/rapier3d-compat';
import {
  BoxGeometry,
  BufferGeometry,
  Object3D,
  Vector3,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Brush, Evaluator } from 'three-bvh-csg';
import { Connectors, ConnectorsCSG, PoweredContainer, WireConnectorCSG } from '../core/container';
import { Brush as BuildingType, Building, Consumption, Item } from '../core/data';
import Instances from '../core/instances';
import { ContainerMaterials } from '../core/materials';
import Physics from '../core/physics';
import Inventory from '../ui/stores/inventory';

export class Tesseract extends PoweredContainer<
  { type: 'link'; }
> {
  private static readonly linkEvent: { type: 'link' } = { type: 'link' };

  private buffer: Item;
  private link?: Tesseract;
  private id: string;
  private readonly parent: Tesseracts;

  constructor(connectors: Connectors, position: Vector3, rotation: number, parent: Tesseracts) {
    super(connectors, position, rotation, Consumption[BuildingType.tesseract]!);
    this.id = nanoid();
    this.buffer = Item.none;
    this.parent = parent;
  }

  getId() {
    return this.id;
  }

  isLinked() {
    return !!this.link;
  }

  getBuffer() {
    return this.buffer;
  }

  setBuffer(item: Item) {
    this.buffer = item;
  }

  setId(id: string) {
    const { parent } = this;
    this.id = id;
    // @dani @incomplete
    // Use some sort of Map instead of iterating through all of them
    const count = parent.getCount();
    for (let i = 0; i < count; i++) {
      const instance = this.parent.getInstance(i);
      if (instance !== this && instance.getId() === id) {
        this.setLink(instance);
        instance.setLink(this);
        break;
      }
    }
  }
  
  setLink(link?: Tesseract) {
    this.link = link;
    this.dispatchEvent(Tesseract.linkEvent);
  }

  resetId() {
    const { link } = this;
    this.id = nanoid();
    if (link) {
      this.setLink(undefined);
      link.setLink(undefined);
    }
    return this.id;
  }

  override dispose() {
    const { buffer, link } = this;
    if (buffer !== Item.none) {
      Inventory.input(buffer);
    }
    if (link) {
      link.setLink(undefined);
    }
  }

  override canInput() {
    const { buffer, enabled, powered } = this;
    return enabled && powered && buffer === Item.none;
  }

  override input(item: Item) {
    this.buffer = item;
  }
  
  override canOutput() {
    const { link, enabled, powered } = this;
    return (
      enabled
      && powered
      && !!link
      && link.getBuffer() !== Item.none
    );
  }

  override output() {
    const { link } = this;
    let item = Item.none;
    if (link) {
      item = link.getBuffer();
      link.setBuffer(Item.none);
    }
    return item;
  }

  override getWireConnector() {
    return this.position.clone()
      .addScaledVector(Object3D.DEFAULT_UP, 1.5);
  }

  override serialize() {
    const { buffer, id, link } = this;
    return [
      ...super.serialize(),
      link ? id : undefined,
      ...(buffer !== Item.none ? [buffer] : []),
    ];
  }
}

const connectors = [
  { position: new Vector3(0, 0, 1) },
  { position: new Vector3(0, 0, -1), rotation: Math.PI * -1 },
  { position: new Vector3(1, 0, 0), rotation: Math.PI * 0.5 },
  { position: new Vector3(-1, 0, 0), rotation: Math.PI * -0.5 },
];

class Tesseracts extends Instances<Tesseract> {
  private static collider: RAPIER.ColliderDesc | undefined;
  static getCollider() {
    if (!Tesseracts.collider) {
      Tesseracts.collider = RAPIER.ColliderDesc.cuboid(1, 1, 1);
    }
    return Tesseracts.collider;
  }

  private static connectors: Connectors | undefined;
  static getConnectors() {
    if (!Tesseracts.connectors) {
      Tesseracts.connectors = new Connectors(connectors);
    }
    return Tesseracts.connectors;
  }

  protected static override readonly cost = Building[BuildingType.tesseract]!;

  private static geometry: BufferGeometry | undefined;
  static getGeometry() {
    if (!Tesseracts.geometry) {
      const csg = new Evaluator();
      const material = Tesseracts.getMaterial();
      const base = new Brush(new BoxGeometry(2, 2, 2), material[0]);
      let brush = base;

      brush = WireConnectorCSG(csg, brush, new Vector3(0, 1.125, 0), material[0], material[1]);
      brush = ConnectorsCSG(csg, brush, connectors, material[1]);

      Tesseracts.geometry = mergeVertices(brush.geometry);
      Tesseracts.geometry.computeBoundingSphere();
    }
    return Tesseracts.geometry;
  }

  static getMaterial() {
    return ContainerMaterials;
  }

  constructor(physics: Physics) {
    super(
      {
        collider: Tesseracts.getCollider(),
        geometry: Tesseracts.getGeometry(),
        material: Tesseracts.getMaterial(),
      },
      physics
    );
  }

  create(position: Vector3, rotation: number, withCost: boolean = true) {
    return super.addInstance(
      new Tesseract(Tesseracts.getConnectors(), position, rotation, this),
      withCost
    );
  }
}

export default Tesseracts;
