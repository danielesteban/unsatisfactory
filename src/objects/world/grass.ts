import {
  BufferGeometry,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Shader,
  Sphere,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ChunkSize, GrassDensity } from './constants';

class Grass extends Mesh {
  private static readonly maxInstances: number = Math.floor(ChunkSize * ChunkSize * GrassDensity * GrassDensity * 0.5);

  private static geometry: BufferGeometry | undefined;
  static getGeometry() {
    if (!Grass.geometry) {
      const aux = new Vector3();
      const quad = new PlaneGeometry(0.075, 0.05, 1, 1);
      const position = quad.getAttribute('position');
      Grass.geometry = mergeGeometries(Array.from({ length: 8 }, () => {
        const q = quad.clone();
        quad.translate(0, 0.05, 0);
        for (let i = 0; i < position.count; i++) {
          aux.fromBufferAttribute(position, i);
          position.setXYZ(i, aux.x - ((aux.y * 0.2) ** 2) * Math.sign(aux.x), aux.y, aux.z);
        }
        return q;
      }));
    }
    return Grass.geometry;
  }

  private static material: MeshBasicMaterial | undefined;
  static getMaterial() {
    if (!Grass.material) {
      const material = new MeshBasicMaterial({});
      material.customProgramCacheKey = () => 'Grass';
      material.onBeforeCompile = (shader: Shader) => {
        shader.vertexShader = shader.vertexShader
          .replace(
            '#include <common>',
            /* glsl */`
            #include <common>
            attribute vec4 instance;
            varying vec3 tint;
            uniform float time;
            float hue2rgb(float f1, float f2, float hue) {
              if (hue < 0.0)
                hue += 1.0;
              else if (hue > 1.0)
                hue -= 1.0;
              float res;
              if ((6.0 * hue) < 1.0)
                res = f1 + (f2 - f1) * 6.0 * hue;
              else if ((2.0 * hue) < 1.0)
                res = f2;
              else if ((3.0 * hue) < 2.0)
                res = f1 + (f2 - f1) * ((2.0 / 3.0) - hue) * 6.0;
              else
                res = f1;
              return res;
            }
            vec3 hsl2rgb(vec3 hsl) {
              vec3 rgb;
              if (hsl.y == 0.0) {
                rgb = vec3(hsl.z);
              } else {
                float f2;
                if (hsl.z < 0.5)
                  f2 = hsl.z * (1.0 + hsl.y);
                else
                  f2 = hsl.z + hsl.y - hsl.y * hsl.z;
                float f1 = 2.0 * hsl.z - f2;
                rgb.r = hue2rgb(f1, f2, hsl.x + (1.0/3.0));
                rgb.g = hue2rgb(f1, f2, hsl.x);
                rgb.b = hue2rgb(f1, f2, hsl.x - (1.0/3.0));
              }   
              return rgb;
            }
            `
          )
          .replace(
            '#include <project_vertex>',
            /* glsl */`
            vec3 p = instance.xyz;
            p.x += cos((time * instance.w - position.y) * 4.0) * 0.1 * position.y;
            p.z += sin((time * instance.w + position.y) * 4.0) * 0.1 * position.y;
            tint = hsl2rgb(vec3(0.65 - instance.w * 0.5, 0.4, 0.6)) * max(position.y, 0.05);

            vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);

            vec2 scale;
            scale.x = length(vec3(modelMatrix[0].x, modelMatrix[0].y, modelMatrix[0].z));
            scale.y = length(vec3(modelMatrix[1].x, modelMatrix[1].y, modelMatrix[1].z));

            vec2 alignedPosition = vec2(position.x, position.y * instance.w * 4.0) * scale;

            mvPosition.xy += alignedPosition;

            gl_Position = projectionMatrix * mvPosition;
            `
          );
        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <clipping_planes_pars_fragment>',
            /* glsl */`
            #include <clipping_planes_pars_fragment>
            varying vec3 tint;
            `
          )
          .replace(
            'vec4 diffuseColor = vec4( diffuse, opacity );',
            /* glsl */`
            vec4 diffuseColor = vec4(diffuse * tint, opacity);
            `
          );
      };
      Grass.material = material;
    }
    return Grass.material;
  }

  constructor(bounds: Sphere) {
    const blade = Grass.getGeometry();
    const geometry = new InstancedBufferGeometry();
    geometry.boundingSphere = bounds;
    geometry.instanceCount = Grass.maxInstances;
    geometry.setIndex(blade.getIndex());
    geometry.setAttribute('position', blade.getAttribute('position'));
    geometry.setAttribute('instance', new InstancedBufferAttribute(new Float32Array(geometry.instanceCount * 4), 4));
    super(geometry, Grass.getMaterial());
    this.matrixAutoUpdate = false;
    this.renderOrder = 2;
    this.visible = false;
  }

  private static readonly aux: Vector3 = new Vector3();
  update(origin: Vector3, lod: number, getGrass: (position: Vector3) => number, getHeight: (position: Vector3) => number) {
    const geometry = this.geometry as InstancedBufferGeometry;
    const { aux, maxInstances } = Grass;
    const offset = ChunkSize * 0.5 + (1 / GrassDensity) * 0.5;
    const instances = geometry.getAttribute('instance');
    const stride = ChunkSize * GrassDensity;
    geometry.instanceCount = 0;
    for (let z = 0; z < stride; z++) {
      for (let x = 0; x < stride; x++) {
        aux.set((x / GrassDensity) - offset, 0, (z / GrassDensity) - offset).multiplyScalar(lod).add(origin);
        let grass = getGrass(aux);
        if (grass > 0) {
          aux.x += Math.cos(grass * 100 / Math.PI * 2);
          aux.z += Math.sin(grass * 100 / Math.PI * 2);
          // @dani
          // This height is too exact for it's own good.
          // This should come from the heightmap
          // The height doesn't match the interpolation
          // It's mostly noticeable in the scaled LOD
          const y = getHeight(aux);
          aux.sub(origin);
          instances.setXYZW(geometry.instanceCount, aux.x, y, aux.z, (grass + 0.15) * 2.0);
          geometry.instanceCount++;
          if (geometry.instanceCount >= maxInstances) {
            break;
          }
        }
      }
    }
    instances.needsUpdate = true;
    this.visible = true;
  }
}

export default Grass;
