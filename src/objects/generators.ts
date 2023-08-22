import RAPIER from '@dimforge/rapier3d-compat';
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  MeshDepthMaterial,
  MeshStandardMaterial,
  Object3D,
  RGBADepthPacking,
  Shader,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ADDITION, Brush, Evaluator } from 'three-bvh-csg';
import Instances, { Instance } from '../core/instances';
import { PoweredContainer } from '../core/container';
import Physics from '../core/physics';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/rust_coarse_01_diff_1k.webp';
import NormalMap from '../textures/rust_coarse_01_nor_gl_1k.webp';
import RoughnessMap from '../textures/rust_coarse_01_rough_1k.webp';

export class Generator extends PoweredContainer {
  private readonly power: number;
  constructor(parent: Generators, position: Vector3, rotation: number, power: number) {
    super(parent, position, rotation, 0, 0, 4);
    this.power = power;
  }

  getPower() {
    return this.enabled ? this.power : 0;
  }
  
  private static readonly wireConnectorAux: Vector3 = new Vector3();
  private static readonly wireConnectorOffset: Vector3 = new Vector3(-1, 0, 0);
  override getWireConnector(): Vector3 {
    return Generator.wireConnectorAux
      .copy(Generator.wireConnectorOffset)
      .applyQuaternion(Instance.getQuaternion(this))
      .add(this.position)
      .addScaledVector(Object3D.DEFAULT_UP, -3.5)
      .clone();
  }
}

class Generators extends Instances<Generator> {
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

  private static geometry: BufferGeometry | undefined;
  private static readonly rotorOffset: Vector3 = new Vector3(0, 5.25, 0);
  static getGeometry() {
    if (!Generators.geometry) {
      const csgEvaluator = new Evaluator();
      let base = new Brush(new BoxGeometry(4, 2, 4));
      base.position.set(0, -5, 0);
      base.updateMatrixWorld();
      const pole = new Brush(new CylinderGeometry(0.125, 0.125, 0.25));
      pole.position.set(-1, -5 + 1.125, 0);
      pole.updateMatrixWorld();
      base = csgEvaluator.evaluate(base, pole, ADDITION);
      const connector = new Brush(new CylinderGeometry(0.25, 0.25, 0.5));
      connector.position.copy(pole.position).add(new Vector3(0, 0.375, 0));
      connector.updateMatrixWorld();
      base = csgEvaluator.evaluate(base, connector, ADDITION);
      const pilar = new Brush(new CylinderGeometry(0.5, 0.5, 12));
      pilar.position.set(1, 0, 0);
      pilar.updateMatrixWorld();
      base = csgEvaluator.evaluate(base, pilar, ADDITION);
      base.geometry.setAttribute('bone', new BufferAttribute(new Int32Array(base.geometry.getAttribute('position').count), 1));

      let rotor = new Brush(new CylinderGeometry(0.5, 0.5, 1));
      rotor.position.copy(Generators.rotorOffset);
      rotor.rotation.z = Math.PI * -0.5;
      rotor.updateMatrixWorld();
      const blade = new Brush(new CylinderGeometry(0.4, 0.2, 6));
      blade.position.copy(Generators.rotorOffset);
      blade.geometry.translate(0, -3, 0);
      for (let i = 0; i < 3; i++) {
        blade.rotation.x = (Math.PI * 2 / 3) * i;
        blade.updateMatrixWorld();
        rotor = csgEvaluator.evaluate(rotor, blade, ADDITION);
      }
      rotor.geometry.setAttribute('bone', new BufferAttribute((new Int32Array(rotor.geometry.getAttribute('position').count)).fill(1), 1));

      Generators.geometry = mergeVertices(mergeGeometries([base.geometry, rotor.geometry]));
      Generators.geometry.computeBoundingSphere();
    }
    return Generators.geometry;
  }
  

  private static readonly animationChunk = /* glsl */`
  vec3 boneOffset = vec3(0, 0, 0);
  mat3 boneRotation = mat3(
    1, 0, 0,
    0, 1, 0,
    0, 0, 1
  );
  if (bone == 1) {
    boneOffset = vec3(${Generators.rotorOffset.x}, ${Generators.rotorOffset.y}, ${Generators.rotorOffset.z});
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

  private static material: MeshStandardMaterial | undefined;
  static getMaterial() {
    if (!Generators.material) {
      const material = new MeshStandardMaterial({
        map: loadTexture(DiffuseMap),
        normalMap: loadTexture(NormalMap),
        roughnessMap: loadTexture(RoughnessMap),
      });
      material.map!.anisotropy = 16;
      material.map!.colorSpace = SRGBColorSpace;
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
            transformed = boneRotation * (transformed - boneOffset) + boneOffset;
            #ifdef USE_ALPHAHASH
            vPosition = boneRotation * (vPosition - boneOffset) + boneOffset;
            #endif
            `
          );
      };
      Generators.material = material;
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
            transformed = boneRotation * (transformed - boneOffset) + boneOffset;
            #ifdef USE_ALPHAHASH
            vPosition = boneRotation * (vPosition - boneOffset) + boneOffset;
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
        depthMaterial: Generators.getDepthMaterial(),
        material: Generators.getMaterial(),
      },
      physics
    );
  }

  create(position: Vector3, rotation: number, power: number = 100) {
    return super.addInstance(new Generator(this, position, rotation, power));
  }
}

export default Generators;
