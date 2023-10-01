import RAPIER from '@dimforge/rapier3d-compat';
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  MathUtils,
  MeshDepthMaterial,
  MeshStandardMaterial,
  Object3D,
  RGBADepthPacking,
  Shader,
  Vector3,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ADDITION, SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
import { Connectors, WireConnectorCSG } from '../core/container';
import { Brush as BuildingType, Building } from '../core/data';
import Generator from '../core/generator';
import Instances, { Instance } from '../core/instances';
import { ConnectorsMaterial, RustMaterial, TexturedMaterial } from '../core/materials';
import Physics from '../core/physics';
import RotorDiffuseMap from '../textures/rock_boulder_dry_diff_1k.webp';
import RotorNormalMap from '../textures/rock_boulder_dry_nor_gl_1k.webp';
import RotorRoughnessMap from '../textures/rock_boulder_dry_rough_1k.webp';

export enum TurbineEfficiencyReason {
  altitude = 1,
  obstruction = 2
}

export class Turbine extends Generator<
  | { type: 'efficiency'; }
> {
  private static readonly efficiencyEvent: { type: 'efficiency' } = { type: 'efficiency' };

  private efficiency: number;
  private efficiencyReasons: number;

  constructor(connectors: Connectors, position: Vector3, rotation: number) {
    super(connectors, position, rotation, 100);
    this.efficiency = 1;
    this.efficiencyReasons = 0;
  }

  getEfficiency() {
    return this.efficiency;
  }

  getEfficiencyReasons() {
    return this.efficiencyReasons;
  }

  setEfficiency(scale: number, reasons: number) {
    this.efficiency = scale;
    this.efficiencyReasons = reasons;
    this.setAvailable(this.getPower());
    this.dispatchEvent(Turbine.efficiencyEvent);
  }

  override getPower() {
    return Math.floor(super.getPower() * this.efficiency);
  }

  private static readonly wireConnectorOffset: Vector3 = new Vector3(-1, 0, 0);
  override getWireConnector() {
    return Turbine.wireConnectorOffset.clone()
      .applyQuaternion(Instance.getQuaternion(this))
      .add(this.position)
      .addScaledVector(Object3D.DEFAULT_UP, -3.5);
  }
}

class Turbines extends Instances<Turbine> {
  private static collider: RAPIER.ColliderDesc[] | undefined;
  static getCollider() {
    if (!Turbines.collider) {
      Turbines.collider = [
        RAPIER.ColliderDesc.cuboid(2, 1, 2)
          .setTranslation(0, -5, 0),
        RAPIER.ColliderDesc.cuboid(0.5, 5, 0.5)
          .setTranslation(1, 1, 0),
      ];
    }
    return Turbines.collider;
  }

  private static connectors: Connectors | undefined;
  static getConnectors() {
    if (!Turbines.connectors) {
      Turbines.connectors = new Connectors([]);
    }
    return Turbines.connectors;
  }

  protected static override readonly cost = Building[BuildingType.turbine]!;

  private static geometry: BufferGeometry | undefined;
  private static readonly rotorOffset: Vector3 = new Vector3(0.75, 0, 0);
  private static readonly rotorPosition: Vector3 = new Vector3(-1, 5.25, 0);
  static getGeometry() {
    if (!Turbines.geometry) {
      const csg = new Evaluator();
      const material = Turbines.getMaterial();

      let rotor = new Brush(new CylinderGeometry(0.25, 0.5, 2), material[0]);
      rotor.position.copy(Turbines.rotorPosition);
      rotor.position.x += 0.25;
      rotor.rotation.z = Math.PI * -0.5;
      rotor.updateMatrixWorld();
      const blade = new Brush(new CylinderGeometry(0.4, 0.2, 6), material[0]);
      blade.position.copy(Turbines.rotorPosition);
      blade.geometry.scale(1.5, 1, 1);
      blade.geometry.translate(0, -3, 0);
      for (let i = 0; i < 3; i++) {
        blade.rotation.x = (Math.PI * 2 / 3) * i;
        blade.updateMatrixWorld();
        rotor = csg.evaluate(rotor, blade, ADDITION);
      }

      let base = new Brush(new BoxGeometry(4, 2, 4), material[1]);
      base.position.set(0, -5, 0);
      base.updateMatrixWorld();

      const shaft = new Brush(new CylinderGeometry(0.5, 0.5, 12), material[1]);
      shaft.position.set(1, 0.001, 0);
      shaft.updateMatrixWorld();
      base = csg.evaluate(base, shaft, ADDITION);

      base = WireConnectorCSG(csg, base, new Vector3(-1, -5 + 1.125, 0), material[1], material[2]);
      const stripe = new Brush(new BoxGeometry(3.5, 0.25, 0.25), material[2]);
      ([
        new Vector3(0, -5, 1.875),
        new Vector3(0, -5, -1.875),
      ]).forEach((position) => {
        for (let i = 0; i < 2; i ++) {
          stripe.position.copy(position);
          stripe.position.y += 0.625 * (i == 0 ? 1 : -1);
          stripe.updateMatrixWorld();
          base = csg.evaluate(base, stripe, SUBTRACTION);
        }
      });

      const merged = mergeVertices(csg.evaluate(rotor, base, ADDITION).geometry);
      const bone = new BufferAttribute(new Int32Array(merged.getAttribute('position').count), 1);
      const index = merged.getIndex()!;
      for (let i = 0; i < merged.groups[0].count; i++) {
        bone.setX(index.getX(i), 1);
      }
      merged.setAttribute('bone', bone);
      Turbines.geometry = merged;
      Turbines.geometry.computeBoundingSphere();
    }
    return Turbines.geometry;
  }

  private static readonly animationChunk = /* glsl */`
  vec3 boneOffset = vec3(0, 0, 0);
  vec3 bonePosition = vec3(0, 0, 0);
  mat3 boneRotation = mat3(
    1, 0, 0,
    0, 1, 0,
    0, 0, 1
  );
  if (bone == 1) {
    boneOffset = vec3(${Turbines.rotorOffset.x}, ${Turbines.rotorOffset.y}, ${Turbines.rotorOffset.z});
    bonePosition = vec3(${Turbines.rotorPosition.x}, ${Turbines.rotorPosition.y}, ${Turbines.rotorPosition.z});
    float a = float(gl_InstanceID) + time * 0.7;
    float c = cos(a);
    float s = sin(a);
    boneRotation = mat3(
      1, 0, 0,
      0, c, s,
      0, -s, c
    );
  }
  `;

  private static rotorMaterial: MeshStandardMaterial | undefined;
  static getRotorMaterial() {
    if (!Turbines.rotorMaterial) {
      const material = TexturedMaterial(
        RotorDiffuseMap,
        RotorNormalMap,
        RotorRoughnessMap,
        { metalness: 0.3 }
      );
      material.customProgramCacheKey = () => 'Turbine';
      material.onBeforeCompile = (shader: Shader) => {
        shader.vertexShader = shader.vertexShader
          .replace(
            '#include <common>',
            /* glsl */`
            #include <common>
            attribute int bone;
            uniform float time;
            `
          )
          .replace(
            '#include <beginnormal_vertex>',
            /* glsl */`
            #include <beginnormal_vertex>
            ${Turbines.animationChunk}
            objectNormal = boneRotation * objectNormal;
            #ifdef USE_TANGENT
            objectTangent = boneRotation * objectTangent;
            #endif
            `
          )
          .replace(
            '#include <begin_vertex>',
            /* glsl */`
            #include <begin_vertex>
            transformed = boneRotation * (transformed - bonePosition) + bonePosition + boneOffset;
            #ifdef USE_ALPHAHASH
            vPosition = boneRotation * (vPosition - bonePosition) + bonePosition + boneOffset;
            #endif
            `
          );
      };
      Turbines.rotorMaterial = material;
    }
    return Turbines.rotorMaterial;
  }

  private static material: MeshStandardMaterial[] | undefined;
  static getMaterial() {
    if (!Turbines.material) {
      Turbines.material = [
        Turbines.getRotorMaterial(),
        RustMaterial,
        ConnectorsMaterial,
      ];
    }
    return Turbines.material;
  }

  private static depthMaterial: MeshDepthMaterial | undefined;
  static getDepthMaterial() {
    if (!Turbines.depthMaterial) {
      const material = new MeshDepthMaterial({ depthPacking: RGBADepthPacking });
      material.customProgramCacheKey = () => 'TurbineDepth';
      material.onBeforeCompile = (shader: Shader) => {
        shader.vertexShader = shader.vertexShader
          .replace(
            '#include <common>',
            /* glsl */`
            #include <common>
            attribute int bone;
            uniform float time;
            `
          )
          .replace(
            '#include <begin_vertex>',
            /* glsl */`
            #include <begin_vertex>
            ${Turbines.animationChunk}
            transformed = boneRotation * (transformed - bonePosition) + bonePosition + boneOffset;
            #ifdef USE_ALPHAHASH
            vPosition = boneRotation * (vPosition - bonePosition) + bonePosition + boneOffset;
            #endif
            `
          );
      };
      Turbines.depthMaterial = material;
    }
    return Turbines.depthMaterial;
  }

  constructor(physics: Physics) {
    super(
      {
        collider: Turbines.getCollider(),
        geometry: Turbines.getGeometry(),
        material: Turbines.getMaterial(),
        depthMaterial: Turbines.getDepthMaterial(),
      },
      physics
    );
  }

  create(position: Vector3, rotation: number, withCost: boolean = true) {
    const turbine = super.addInstance(
      new Turbine(Turbines.getConnectors(), position, rotation),
      withCost
    );
    this.updateEfficiency();
    return turbine;
  }

  override removeInstance(instance: Turbine) {
    super.removeInstance(instance);
    this.updateEfficiency();
  }

  private static readonly efficiencyEvent = { type: 'efficiency' };
  private static readonly efficiencyRadiusSquared = 32 ** 2;
  private isUpdatingEfficiency: boolean = false;
  private updateEfficiency() {
    if (this.isUpdatingEfficiency) {
      return;
    }
    this.isUpdatingEfficiency = true;
    // @dani
    // Defer to the end of the frame
    // So it happens only once
    new Promise(() => {
      this.isUpdatingEfficiency = false;
      const count = this.getCount();
      for (let i = 0; i < count; i++) {
        const turbine = this.getInstance(i);
        let efficiency = MathUtils.clamp(turbine.position.y / 10, 0.3, 1);
        let reasons = efficiency < 1 ? TurbineEfficiencyReason.altitude : 0;
        for (let j = 0; j < count; j++) {
          if (j === i) {
            continue;
          }
          const instance = this.getInstance(j);
          if (instance.position.distanceToSquared(turbine.position) < Turbines.efficiencyRadiusSquared) {
            efficiency *= 0.5;
            reasons |= TurbineEfficiencyReason.obstruction;
          }
        }
        turbine.setEfficiency(Math.max(efficiency, 0.15), reasons);
      }
      this.dispatchEvent(Turbines.efficiencyEvent);
    });
  }
}

export default Turbines;
