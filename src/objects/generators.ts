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
import { ADDITION, Brush, Evaluator } from 'three-bvh-csg';
import { Connectors, PoweredContainer } from '../core/container';
import Instances, { Instance } from '../core/instances';
import { ConnectorsMaterial, RustMaterial, TexturedMaterial } from '../core/materials';
import Physics from '../core/physics';
import { Item } from './items';
import RotorDiffuseMap from '../textures/rock_boulder_dry_diff_1k.webp';
import RotorNormalMap from '../textures/rock_boulder_dry_nor_gl_1k.webp';
import RotorRoughnessMap from '../textures/rock_boulder_dry_rough_1k.webp';

export enum GeneratorEfficiencyReason {
  altitude = 1,
  obstruction = 2
}

export class Generator extends PoweredContainer<
  { type: 'available'; }
  | { type: 'efficiency'; }
> {
  private static readonly availableEvent: { type: 'available' } = { type: 'available' };
  private static readonly efficiencyEvent: { type: 'efficiency' } = { type: 'efficiency' };

  private available: number;
  private efficiency: number;
  private efficiencyReasons: number;
  private readonly power: number;

  constructor(connectors: Connectors, position: Vector3, rotation: number, power: number = 100) {
    super(connectors, position, rotation, 0, 4);
    this.available = power;
    this.efficiency = 1;
    this.efficiencyReasons = 0;
    this.power = power;
  }

  getAvailable() {
    return this.enabled ? this.available : 0;
  }

  setAvailable(power: number) {
    this.available = power;
    this.dispatchEvent(Generator.availableEvent);
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
    this.available = this.getPower();
    this.dispatchEvent(Generator.efficiencyEvent);
  }

  getPower() {
    return this.enabled ? Math.floor(this.power * this.efficiency) : 0;
  }
  
  private static readonly wireConnectorOffset: Vector3 = new Vector3(-1, 0, 0);
  override getWireConnector() {
    return Generator.wireConnectorOffset.clone()
      .applyQuaternion(Instance.getQuaternion(this))
      .add(this.position)
      .addScaledVector(Object3D.DEFAULT_UP, -3.5);
  }
}

class Generators extends Instances<Generator> {
  static override readonly cost: typeof Instances.cost = [
    { item: Item.ironPlate, count: 20 },
    { item: Item.wire, count: 10 },
  ];

  private static collider: RAPIER.ColliderDesc[] | undefined;
  static getCollider() {
    if (!Generators.collider) {
      Generators.collider = [
        RAPIER.ColliderDesc.cuboid(2, 1, 2)
          .setTranslation(0, -5, 0),
        RAPIER.ColliderDesc.cuboid(0.5, 5, 0.5)
          .setTranslation(1, 1, 0),
      ];
    }
    return Generators.collider;
  }

  private static connectors: Connectors | undefined;
  static getConnectors() {
    if (!Generators.connectors) {
      Generators.connectors = new Connectors([]);
    }
    return Generators.connectors;
  }

  private static geometry: BufferGeometry | undefined;
  private static readonly rotorOffset: Vector3 = new Vector3(1, 0, 0);
  private static readonly rotorPosition: Vector3 = new Vector3(-1, 5.25, 0);
  static getGeometry() {
    if (!Generators.geometry) {
      const csg = new Evaluator();
      const material = Generators.getMaterial();

      let rotor = new Brush(new CylinderGeometry(0.5, 0.5, 1.5), material[0]);
      rotor.position.copy(Generators.rotorPosition);
      rotor.rotation.z = Math.PI * -0.5;
      rotor.updateMatrixWorld();
      const blade = new Brush(new CylinderGeometry(0.4, 0.2, 6), material[0]);
      blade.position.copy(Generators.rotorPosition);
      blade.geometry.translate(0, -3, 0);
      for (let i = 0; i < 3; i++) {
        blade.rotation.x = (Math.PI * 2 / 3) * i;
        blade.updateMatrixWorld();
        rotor = csg.evaluate(rotor, blade, ADDITION);
      }

      let base = new Brush(new BoxGeometry(4, 2, 4), material[1]);
      base.position.set(0, -5, 0);
      base.updateMatrixWorld();

      const pilar = new Brush(new CylinderGeometry(0.5, 0.5, 12), material[1]);
      pilar.position.set(1, 0, 0);
      pilar.updateMatrixWorld();
      base = csg.evaluate(base, pilar, ADDITION);

      const pole = new Brush(new CylinderGeometry(0.125, 0.125, 0.25), material[2]);
      pole.position.set(-1, -5 + 1.125, 0);
      pole.updateMatrixWorld();
      base = csg.evaluate(base, pole, ADDITION);
      const cap = new Brush(new CylinderGeometry(0.25, 0.25, 0.5), material[1]);
      cap.position.copy(pole.position).add(new Vector3(0, 0.375, 0));
      cap.updateMatrixWorld();
      base = csg.evaluate(base, cap, ADDITION);

      const merged = mergeVertices(csg.evaluate(rotor, base, ADDITION).geometry);
      const bone = new BufferAttribute(new Int32Array(merged.getAttribute('position').count), 1);
      const index = merged.getIndex()!;
      for (let i = 0; i < merged.groups[0].count; i++) {
        bone.setX(index.getX(i), 1);
      }
      merged.setAttribute('bone', bone);
      Generators.geometry = merged;
      Generators.geometry.computeBoundingSphere();
    }
    return Generators.geometry;
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
    boneOffset = vec3(${Generators.rotorOffset.x}, ${Generators.rotorOffset.y}, ${Generators.rotorOffset.z});
    bonePosition = vec3(${Generators.rotorPosition.x}, ${Generators.rotorPosition.y}, ${Generators.rotorPosition.z});
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
    if (!Generators.rotorMaterial) {
      const material = TexturedMaterial(
        RotorDiffuseMap,
        RotorNormalMap,
        RotorRoughnessMap,
      );
      [material.map!, material.normalMap!, material.roughnessMap!].forEach((map) => (
        map!.repeat.set(0.2, 0.2)
      ));
      material.metalness = 0.3;
      material.customProgramCacheKey = () => 'Generator';
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
            ${Generators.animationChunk}
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
      Generators.rotorMaterial = material;
    }
    return Generators.rotorMaterial;
  }

  private static material: MeshStandardMaterial[] | undefined;
  static getMaterial() {
    if (!Generators.material) {
      Generators.material = [
        Generators.getRotorMaterial(),
        RustMaterial(),
        ConnectorsMaterial(),
      ];
    }
    return Generators.material;
  }

  private static depthMaterial: MeshDepthMaterial | undefined;
  static getDepthMaterial() {
    if (!Generators.depthMaterial) {
      const material = new MeshDepthMaterial({ depthPacking: RGBADepthPacking });
      material.customProgramCacheKey = () => 'GeneratorDepth';
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
            ${Generators.animationChunk}
            transformed = boneRotation * (transformed - bonePosition) + bonePosition + boneOffset;
            #ifdef USE_ALPHAHASH
            vPosition = boneRotation * (vPosition - bonePosition) + bonePosition + boneOffset;
            #endif
            `
          );
      };
      Generators.depthMaterial = material;
    }
    return Generators.depthMaterial;
  }

  constructor(physics: Physics) {
    super(
      {
        collider: Generators.getCollider(),
        geometry: Generators.getGeometry(),
        material: Generators.getMaterial(),
        depthMaterial: Generators.getDepthMaterial(),
      },
      physics
    );
  }

  create(position: Vector3, rotation: number, withCost: boolean = true) {
    const generator = super.addInstance(
      new Generator(Generators.getConnectors(), position, rotation),
      withCost
    );
    this.updateEfficiency();
    return generator;
  }

  override removeInstance(instance: Generator) {
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
        const generator = this.getInstance(i);
        let efficiency = MathUtils.clamp(generator.position.y / 10, 0.3, 1);
        let reasons = efficiency < 1 ? GeneratorEfficiencyReason.altitude : 0;
        for (let j = 0; j < count; j++) {
          if (j === i) {
            continue;
          }
          const instance = this.getInstance(j);
          if (instance.position.distanceToSquared(generator.position) < Generators.efficiencyRadiusSquared) {
            efficiency *= 0.5;
            reasons |= GeneratorEfficiencyReason.obstruction;
          }
        }
        generator.setEfficiency(Math.max(efficiency, 0.15), reasons);
      }
      this.dispatchEvent(Generators.efficiencyEvent);
    });
  }
}

export default Generators;
