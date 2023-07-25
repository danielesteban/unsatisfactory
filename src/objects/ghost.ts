import {
  BufferGeometry,
  Mesh,
  MeshStandardMaterial,
  Shader,
  Vector3,
} from 'three';

export class Ghost extends Mesh {
  private static material: MeshStandardMaterial | undefined;
  static getMaterial() {
    if (!Ghost.material) {
      const material = new MeshStandardMaterial({
        color: 0x555599,
        transparent: true,
      });
      material.customProgramCacheKey = () => 'Ghost';
      material.userData.time = { value: 0 };
      material.onBeforeCompile = (shader: Shader) => {
        shader.uniforms.time = material.userData.time;
        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <clipping_planes_pars_fragment>',
            /* glsl */`
            #include <clipping_planes_pars_fragment>
            uniform float time;
            `
          )
          .replace(
            'vec4 diffuseColor = vec4( diffuse, opacity );',
            /* glsl */`
            float line = smoothstep(1.0, 3.0, mod(float(gl_FragCoord.y) - time, 5.0));
            vec4 diffuseColor = vec4(diffuse, opacity * line);
            `
          );
      };
      Ghost.material = material;
    }
    return Ghost.material;
  }

  constructor() {
    super(undefined, Ghost.getMaterial());
    this.matrixAutoUpdate = false;
    this.visible = false;
  }

  override raycast() {

  }

  update(geometry: BufferGeometry, position: Vector3, rotation: number) {
    this.geometry = geometry;
    this.position.copy(position);
    this.rotation.y = rotation;
    this.updateMatrix();
    this.visible = true;
    Ghost.material!.userData.time.value = performance.now() * 0.05;
  }
};

export default Ghost;
