import {
  BufferAttribute,
  DoubleSide,
  DynamicDrawUsage,
  Group,
  InstancedBufferGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  MeshBasicMaterial,
  Shader,
  Vector3,
} from 'three';

class Birds extends InstancedMesh {
  private static geometry: {
    bone: BufferAttribute,
    color: BufferAttribute,
    position: BufferAttribute,
  } | undefined;
  static getGeometry() {
    if (!Birds.geometry) {
      const position = new Float32Array([
        0, 0, -0.5,    0, 0,  0.5,    -1, 1, 0,
        0, 0,  0.5,    0, 0, -0.5,     1, 1, 0,
      ]);
      const bone = new Float32Array([
        0,              0,               1,
        0,              0,               1,
      ]);
      const color = new Float32Array([
        1, 1, 1,         1, 1, 1,        1, 1, 1,
        0.9, 0.9, 0.9,   0.9, 0.9, 0.9,  0.9, 0.9, 0.9,
      ]);
      Birds.geometry = {
        bone: new BufferAttribute(bone, 1),
        color: new BufferAttribute(color, 3),
        position: new BufferAttribute(position, 3),
      };
    }
    return Birds.geometry;
  }

  private static material: MeshBasicMaterial | undefined;
  static getMaterial() {
    if (!Birds.material) {
      const material = new MeshBasicMaterial({
        opacity: 0.3,
        transparent: true,
        side: DoubleSide,
        vertexColors: true,
      });
      material.customProgramCacheKey = () => 'Birds';
      material.onBeforeCompile = (shader: Shader) => {
        shader.uniforms.animation = { value: 0 };
        shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          /* glsl */`
          #include <common>
          attribute float bone;
          attribute vec3 tint;
          attribute float velocity;
          varying vec3 vtint;
          uniform float time;
          `,
        )
        .replace(
          '#include <begin_vertex>',
          /* glsl */`
          vec3 transformed = vec3(position);
          if (bone > 0.5) {
            float s = (sin(time * 10.0 * velocity) + 1.0) * 0.5;
            transformed.x *= (s * 0.5) + 0.5;
            transformed.y *= (2.0 - (s * 2.0)) - 1.0;
          }
          vtint = tint;
          `
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          /* glsl */`
          #include <common>
          varying vec3 vtint;
          `
        )
        .replace(
          'vec4 diffuseColor = vec4( diffuse, opacity );',
          /* glsl */`
          vec4 diffuseColor = vec4(diffuse * vtint, opacity);
          `
        );
      };
      Birds.material = material;
    }
    return Birds.material;
  }

  private static readonly count: number = 32;
  private static readonly radius: number = 96;
  private readonly anchor: Vector3;
  private readonly origins: BufferAttribute;
  private readonly targets: BufferAttribute;
  private readonly timing: Float32Array;

  constructor(anchor: Vector3) {
    const { bone, color, position } = Birds.getGeometry();
    const geometry = new InstancedBufferGeometry();
    geometry.setAttribute('position', position);
    geometry.setAttribute('bone', bone);
    geometry.setAttribute('color', color);
    geometry.setAttribute('tint', new InstancedBufferAttribute(new Float32Array(Birds.count * 3), 3));
    geometry.setAttribute('velocity', new InstancedBufferAttribute(new Float32Array(Birds.count), 1));
    super(
      geometry,
      Birds.getMaterial(),
      Birds.count
    );
    this.instanceMatrix.setUsage(DynamicDrawUsage);
    this.frustumCulled = false;
    this.matrixAutoUpdate = false;
    this.anchor = anchor;
    this.origins = new BufferAttribute(new Float32Array(Birds.count * 3), 3);
    this.targets = new BufferAttribute(new Float32Array(Birds.count * 3), 3);
    this.timing = new Float32Array(Birds.count);
  }

  override dispose() {
    const { geometry } = this;
    super.dispose();
    geometry.dispose();
  }

  init() {
    for (let i = 0; i < Birds.count; i++) {
      this.resetBird(i);
    }
    this.instanceMatrix.needsUpdate = true;
  }

  private static readonly auxObject: Group = new Group();
  private static readonly auxVector: Vector3 = new Vector3();
  private static readonly auxVectorB: Vector3 = new Vector3();
  step(delta: number) {
    const {
      count, radius,
      auxObject: bird,
      auxVector: aux,
      auxVectorB: target,
    } = Birds;
    const {
      anchor,
      geometry,
      origins,
      targets,
      timing,
    } = this;
    const velocities = geometry.getAttribute('velocity');
    for (let i = 0; i < count; i += 1) {
      const velocity = velocities.getX(i);
      timing[i] += delta * (0.5 + (velocity * 0.5)) * 0.1;
      target.fromBufferAttribute(targets, i);
      if (timing[i] > 1) {
        this.resetBird(i, target);
      } else {
        aux
          .fromBufferAttribute(origins, i)
          .lerp(target, timing[i]);
        if (aux.distanceToSquared(anchor) >= (radius * 2) ** 2) {
          this.resetBird(i);
        } else {
          bird.position.copy(aux);
          bird.lookAt(aux.copy(target));
          const scale = 0.3 + ((1 - velocities.getX(i)) * 0.5);
          bird.scale.set(scale, scale, scale);
          bird.updateMatrix();
          this.setMatrixAt(i, bird.matrix);
        }
      }
    }
    this.instanceMatrix.needsUpdate = true;
  }

  private resetBird(i: number, origin?: Vector3) {
    const {
      radius,
      auxObject: bird,
      auxVector: target,
    } = Birds;
    const {
      anchor,
      geometry,
      origins,
      targets,
      timing,
    } = this;
    const tints = geometry.getAttribute('tint');
    const velocities = geometry.getAttribute('velocity');
    timing[i] = 0;
    target.setFromCylindricalCoords(
      radius,
      Math.random() * Math.PI * 2,
      radius * (0.2 + (Math.random() * 0.5))
    );
    target.x += anchor.x;
    target.z += anchor.z;
    targets.setXYZ(i, target.x, target.y, target.z);
    if (origin) {
      bird.position.copy(origin);
    } else {
      bird.position.setFromCylindricalCoords(
        radius,
        Math.random() * Math.PI * 2,
        radius * (0.2 + (Math.random() * 0.5))
      );
      bird.position.x += anchor.x;
      bird.position.z += anchor.z;
      tints.setXYZ(i, Math.random(), Math.random(), Math.random());
      tints.needsUpdate = true;
      velocities.setX(i, 0.2 + Math.random() * 0.5);
      velocities.needsUpdate = true;
    }
    origins.setXYZ(i, bird.position.x, bird.position.y, bird.position.z);
    bird.lookAt(target);
    const scale = 0.2 + ((1 - velocities.getX(i)) * 0.5);
    bird.scale.set(scale, scale, scale);
    bird.updateMatrix();
    this.setMatrixAt(i, bird.matrix);
  }
}

export default Birds;
