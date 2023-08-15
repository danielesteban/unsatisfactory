import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Intersection,
  Mesh,
  MeshStandardMaterial,
  Raycaster,
  SRGBColorSpace,
  SphereGeometry,
  Vector3,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ADDITION, SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
import seedrandom from 'seedrandom';
import { Item } from './items';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/rock_boulder_dry_diff_1k.webp';
import NormalMap from '../textures/rock_boulder_dry_nor_gl_1k.webp';
import RoughnessMap from '../textures/rock_boulder_dry_rough_1k.webp';

export class Deposit extends Mesh {
  private static collider: BufferGeometry | undefined;
  static getCollider() {
    if (!Deposit.collider) {
      Deposit.collider = new SphereGeometry(4);
      Deposit.collider.scale(1, 0.5, 1);
      Deposit.collider.computeBoundingSphere();
    }
    return Deposit.collider;
  }

  private static geometry: BufferGeometry | undefined;
  static getGeometry() {
    if (!Deposit.geometry) {
      const csgEvaluator = new Evaluator();
      let model = new Brush(new SphereGeometry(4));
      model.geometry.scale(1, 0.5, 1);
      const brush = new Brush(new BoxGeometry(1, 1, 1));

      const rng = seedrandom('deposits');
      for (let i = 0; i < 32; i++) {
        brush.rotation.set(
          (rng() - 0.5) * Math.PI * 2,
          (rng() - 0.5) * Math.PI * 2,
          (rng() - 0.5) * Math.PI * 2,
        );
        brush.scale.set(
          0.5 + rng() * 2,
          0.5 + rng() * 2,
          0.5 + rng() * 2
        );
        const r = brush.scale.length();
        brush.position.setFromSphericalCoords(
          r,
          (0.3 + rng() * 0.2) * Math.PI,
          i / 16 * Math.PI * 2
        );
        brush.updateMatrixWorld();
        model = csgEvaluator.evaluate(model, brush, ADDITION);
      }

      brush.position.set(0, -2, 0);
      brush.scale.set(10, 4, 10);
      brush.rotation.set(0, 0, 0);
      brush.updateMatrixWorld();
      model = csgEvaluator.evaluate(model, brush, SUBTRACTION);

      const carving = new Brush(new CylinderGeometry(2, 1.5, 0.625));
      carving.position.set(0, 2, 0);
      carving.updateMatrixWorld();
      model = csgEvaluator.evaluate(model, carving, SUBTRACTION);

      Deposit.geometry = mergeVertices(model.geometry);
      Deposit.geometry.computeBoundingSphere();
    }
    return Deposit.geometry;
  }

  private static material: MeshStandardMaterial | undefined;
  static getMaterial() {
    if (!Deposit.material) {
      const material = new MeshStandardMaterial({
        map: loadTexture(DiffuseMap),
        normalMap: loadTexture(NormalMap),
        roughnessMap: loadTexture(RoughnessMap),
        roughness: 0.7,
      });
      material.map!.anisotropy = 16;
      material.map!.colorSpace = SRGBColorSpace;
      Deposit.material = material;
    }
    return Deposit.material;
  }

  private item: Item;
  private purity: number;

  constructor() {
    super(Deposit.getGeometry(), Deposit.getMaterial());
    this.castShadow = this.receiveShadow = true;
    this.matrixAutoUpdate = false;
    this.item = Item.none;
    this.purity = 0;
  }

  getItem() {
    return this.item;
  }

  getPurity() {
    return this.purity;
  }

  override raycast(raycaster: Raycaster, intersects: Intersection[]) {
    const { geometry, visible } = this;
    if (!visible) {
      return;
    }
    this.geometry = Deposit.getCollider();
    super.raycast(raycaster, intersects);
    this.geometry = geometry;
  }

  private static readonly aux: Vector3 = new Vector3();
  private static readonly auxB: Vector3 = new Vector3();
  private static readonly auxC: Vector3 = new Vector3();
  private static readonly auxD: Vector3 = new Vector3();
  private static readonly auxE: Vector3 = new Vector3();
  update(origin: Vector3, getDeposit: (position: Vector3) => number, getGrass: (position: Vector3) => number, getHeight: (position: Vector3) => number) {
    const { aux, auxB, auxC, auxD, auxE } = Deposit;
    aux.set(8, 0, 8).add(origin);
    const deposit = getDeposit(aux);
    if (deposit > 0.2 && getGrass(aux) < -0.2) {
      let y = getHeight(aux) * 0.2;

      auxB.set(-4, 0, -4).add(aux);
      auxB.y = getHeight(auxB);
      auxC.set(4, 0, 4).add(aux);
      auxC.y = getHeight(auxC);
      auxD.subVectors(auxB, auxC).normalize();
      if (auxB.y < auxC.y) auxD.negate();
      y += auxB.y * 0.2;
      y += auxC.y * 0.2;

      auxB.set(4, 0, -4).add(aux);
      auxB.y = getHeight(auxB);
      auxC.set(-4, 0, 4).add(aux);
      auxC.y = getHeight(auxC);
      auxE.subVectors(auxB, auxC).normalize();
      if (auxB.y < auxC.y) auxE.negate();
      y += auxB.y * 0.2;
      y += auxC.y * 0.2;
      y -= 1;

      this.position.copy(aux).sub(origin);
      this.position.y = y;
      this.visible = true;
      this.updateMatrix();
      this.updateMatrixWorld();

      auxE.lerp(auxD, 0.5).normalize().add(aux);
      auxE.y += y;
      this.lookAt(auxE);
      this.updateMatrix();
      this.updateMatrixWorld();

      this.item = Item.ore;
      this.purity = deposit > 0.3 ? 1 : 2;
    } else {
      this.visible = false;
    }
  }
}

export default Deposit;
