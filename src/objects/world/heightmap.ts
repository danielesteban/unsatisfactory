import {
  BufferAttribute,
  BufferGeometry,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  Shader,
  ShaderChunk,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { ChunkSize } from './constants';
import { loadTexture } from '../../textures';
import DiffuseColdMap from '../../textures/coral_fort_wall_02_diff_1k.webp';
import NormalColdMap from '../../textures/coral_fort_wall_02_nor_gl_1k.webp';
import RoughnessColdMap from '../../textures/coral_fort_wall_02_rough_1k.webp';
import DiffuseWarmMap from '../../textures/sand_01_diff_1k.webp';
import NormalWarmMap from '../../textures/sand_01_nor_gl_1k.webp';
import RoughnessWarmMap from '../../textures/sand_01_rough_1k.webp';
import DiffuseHotMap from '../../textures/coast_sand_rocks_02_diff_1k.webp';
import NormalHotMap from '../../textures/coast_sand_rocks_02_nor_gl_1k.webp';
import RoughnessHotMap from '../../textures/coast_sand_rocks_02_rough_1k.webp';

class Heightmap extends Mesh {
  private static geometry: PlaneGeometry | undefined;
  static getGeometry() {
    if (!Heightmap.geometry) {
      const geometry = new PlaneGeometry(ChunkSize, ChunkSize, ChunkSize, ChunkSize);
      geometry.rotateX(Math.PI * -0.5);
      geometry.computeBoundingSphere();
      Heightmap.geometry = geometry;

      const { aux } = Heightmap;
      const position = geometry.getAttribute('position');
      Heightmap.geometryIndex = new Uint32Array(position.count);
      for (let i = 0; i < position.count; i++) {
        aux.fromBufferAttribute(position, i);
        Heightmap.geometryIndex[i] = (
          Math.floor(aux.x + ChunkSize * 0.5) * (ChunkSize + 1)
          + Math.floor(aux.z + ChunkSize * 0.5)
        );
      }
    }
    return Heightmap.geometry;
  }

  private static geometryIndex: Uint32Array | undefined;
  static getGeometryIndex() {
    if (!Heightmap.geometryIndex) {
      const { aux } = Heightmap;
      const geometry = Heightmap.getGeometry();
      const position = geometry.getAttribute('position');
      const index = new Uint32Array(position.count);
      for (let i = 0; i < position.count; i++) {
        aux.fromBufferAttribute(position, i);
        index[i] = (
          Math.floor(aux.x + ChunkSize * 0.5) * (ChunkSize + 1)
          + Math.floor(aux.z + ChunkSize * 0.5)
        );
      }
      Heightmap.geometryIndex = index;
    }
    return Heightmap.geometryIndex;
  }

  private static material: MeshStandardMaterial | undefined;
  static getMaterial() {
    if (!Heightmap.material) {
      const textures = {
        cold: {
          map: loadTexture(DiffuseColdMap),
          normalMap: loadTexture(NormalColdMap),
          roughnessMap: loadTexture(RoughnessColdMap),
        },
        warm: {
          map: loadTexture(DiffuseWarmMap),
          normalMap: loadTexture(NormalWarmMap),
          roughnessMap: loadTexture(RoughnessWarmMap),
        },
        hot: {
          map: loadTexture(DiffuseHotMap),
          normalMap: loadTexture(NormalHotMap),
          roughnessMap: loadTexture(RoughnessHotMap),
        },
      }
      const material = new MeshStandardMaterial({
        ...textures.cold,
      });
      [textures.cold, textures.warm, textures.hot].forEach((textures) => {
        textures.map!.anisotropy = 16;
        textures.map!.colorSpace = SRGBColorSpace;
        [textures.map!, textures.normalMap!, textures.roughnessMap!].forEach((map) => {
          map.repeat.set(4, 4);
          map.wrapS = map.wrapT = RepeatWrapping;
        });
      })
      material.customProgramCacheKey = () => 'Heightmap';
      material.onBeforeCompile = (shader: Shader) => {
        shader.uniforms.mapB = { value: textures.warm.map };
        shader.uniforms.normalMapB = { value: textures.warm.normalMap };
        shader.uniforms.roughnessMapB = { value: textures.warm.roughnessMap };
        shader.uniforms.mapC = { value: textures.hot.map };
        shader.uniforms.normalMapC = { value: textures.hot.normalMap };
        shader.uniforms.roughnessMapC = { value: textures.hot.roughnessMap };
        shader.vertexShader = shader.vertexShader
          .replace(
            '#include <clipping_planes_pars_vertex>',
            /* glsl */`
            #include <clipping_planes_pars_vertex>
            attribute float heat;
            attribute float height;
            varying float vHeat;
            `
          )
          .replace(
            '#include <clipping_planes_vertex>',
            /* glsl */`
            #include <clipping_planes_vertex>
            vHeat = heat;
            `
          )
          .replace(
            '#include <begin_vertex>',
            /* glsl */`
            vec3 transformed = vec3( position + vec3(0, height, 0) );
            #ifdef USE_ALPHAHASH
              vPosition = vec3( position + vec3(0, height, 0) );
            #endif
            `
          );
        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <clipping_planes_pars_fragment>',
            /* glsl */`
            #include <clipping_planes_pars_fragment>
            uniform sampler2D mapB;
            uniform sampler2D normalMapB;
            uniform sampler2D roughnessMapB;
            uniform sampler2D mapC;
            uniform sampler2D normalMapC;
            uniform sampler2D roughnessMapC;
            varying float vHeat;
            vec4 textureHeat(sampler2D mapperCold, sampler2D mapperWarm, sampler2D mapperHot, in vec2 uv) {
              return mix(
                vHeat > 0.5 ? texture2D(mapperWarm, uv) : texture2D(mapperCold, uv),
                vHeat > 0.5 ? texture2D(mapperHot, uv) : texture2D(mapperWarm, uv),
                (vHeat > 0.5 ? vHeat - 0.5 : vHeat) * 2.0
              );
            }
            `
          )
          .replace(
            '#include <map_fragment>',
            ShaderChunk.map_fragment.replace(/texture2D\( map/g, 'textureHeat(map, mapB, mapC')
          )
          .replace(
            '#include <normal_fragment_maps>',
            ShaderChunk.normal_fragment_maps.replace(/texture2D\( normalMap/g, 'textureHeat(normalMap, normalMapB, normalMapC')
          )
          .replace(
            '#include <roughnessmap_fragment>',
            ShaderChunk.roughnessmap_fragment.replace(/texture2D\( roughnessMap/g, 'textureHeat(roughnessMap, roughnessMapB, roughnessMapC')
          );
      };
      Heightmap.material = material;
    }
    return Heightmap.material;
  }

  public readonly heatmap: Float32Array;
  public readonly heightmap: Float32Array;

  constructor() {
    const base = Heightmap.getGeometry();
    const geometry = new BufferGeometry();
    geometry.boundingSphere = base.boundingSphere!.clone();
    geometry.setIndex(base.getIndex());
    geometry.setAttribute('position', base.getAttribute('position'));
    geometry.setAttribute('uv', base.getAttribute('uv'));
    geometry.setAttribute('normal', base.getAttribute('normal').clone());
    geometry.setAttribute('heat', new BufferAttribute(new Float32Array(geometry.getAttribute('position').count), 1));
    geometry.setAttribute('height', new BufferAttribute(new Float32Array(geometry.getAttribute('position').count), 1));
    super(geometry, Heightmap.getMaterial());
    this.castShadow = this.receiveShadow = true;
    this.matrixAutoUpdate = false;
    this.heatmap = new Float32Array((ChunkSize + 1) * (ChunkSize + 1));
    this.heightmap = new Float32Array((ChunkSize + 1) * (ChunkSize + 1));
  }

  private static readonly aux: Vector3 = new Vector3();
  update(origin: Vector3, lod: number, getGrass: (position: Vector3) => number, getHeight: (position: Vector3) => number) {
    const { geometry, heatmap, heightmap } = this;
    const { aux } = Heightmap;
    const heat = geometry.getAttribute('heat');
    const height = geometry.getAttribute('height');
    const position = geometry.getAttribute('position');
    for (let i = 0, x = 0; x < (ChunkSize + 1); x++) {
      for (let z = 0; z < (ChunkSize + 1); z++, i++) {
        aux.set(x - ChunkSize * 0.5, 0, z - ChunkSize * 0.5).multiplyScalar(lod).add(origin);
        heatmap[i] = 1 - ((1 - Math.min(Math.max((getGrass(aux) + 0.5) * 1.5, 0), 1)) ** 3);
        heightmap[i] = getHeight(aux);
      }
    }
    let maxRadiusSq = 0;
    const geometryIndex = Heightmap.getGeometryIndex();
    for (let i = 0; i < position.count; i++) {
      const index = geometryIndex[i];
      const y = heightmap[index];
      heat.setX(i, heatmap[index]);
      height.setX(i, y);
      aux.fromBufferAttribute(position, i);
      aux.y += y;
      maxRadiusSq = Math.max(maxRadiusSq, aux.lengthSq());
    }
    geometry.boundingSphere!.radius = Math.sqrt(maxRadiusSq);
    this.computeNormals();
    heat.needsUpdate = height.needsUpdate = true;
    this.scale.set(lod, 1, lod);
    this.updateMatrix();
    this.updateMatrixWorld();
  }

  // @dani
  // Copy pasta from BufferGeometry's computeVertexNormals
  // Adapted to use the height attribute
  private static readonly computeNormalsAux = {
    pA: new Vector3(), pB: new Vector3(), pC: new Vector3(),
    nA: new Vector3(), nB: new Vector3(), nC: new Vector3(),
    cb: new Vector3(), ab: new Vector3(),
  };
  private computeNormals() {
    const { geometry } = this;
    const {
      pA, pB, pC,
      nA, nB, nC,
      cb, ab,
    } = Heightmap.computeNormalsAux;
    const index = geometry.getIndex()!;
    const position = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');
    const height = geometry.getAttribute('height');

    for (let i = 0, l = normal.count; i < l; i++) {
      normal.setXYZ( i, 0, 0, 0);
    }

    for (let i = 0, l = index.count; i < l; i += 3) {
      const vA = index.getX(i + 0);
      const vB = index.getX(i + 1);
      const vC = index.getX(i + 2);

      pA.fromBufferAttribute(position, vA);
      pA.y += height.getX(vA);
      pB.fromBufferAttribute(position, vB);
      pB.y += height.getX(vB);
      pC.fromBufferAttribute(position, vC);
      pC.y += height.getX(vC);

      cb.subVectors(pC, pB);
      ab.subVectors(pA, pB);
      cb.cross(ab);

      nA.fromBufferAttribute(normal, vA);
      nB.fromBufferAttribute(normal, vB);
      nC.fromBufferAttribute(normal, vC);

      nA.add(cb);
      nB.add(cb);
      nC.add(cb);

      normal.setXYZ(vA, nA.x, nA.y, nA.z);
      normal.setXYZ(vB, nB.x, nB.y, nB.z);
      normal.setXYZ(vC, nC.x, nC.y, nC.z);
    }

    geometry.normalizeNormals();
    normal.needsUpdate = true;
  }
}

export default Heightmap;
