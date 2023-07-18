import {
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  Shader,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/coast_sand_rocks_02_diff_1k.jpg';
import NormalMap from '../textures/coast_sand_rocks_02_nor_gl_1k.jpg';
import RoughnessMap from '../textures/coast_sand_rocks_02_rough_1k.jpg';

export class TerrainChunk extends Mesh {
  public static readonly size: number = 16;

  private static geometry: PlaneGeometry | undefined;
  static setupGeometry() {
    TerrainChunk.geometry = new PlaneGeometry(TerrainChunk.size, TerrainChunk.size, TerrainChunk.size, TerrainChunk.size);
    TerrainChunk.geometry.rotateX(Math.PI * -0.5);
    TerrainChunk.geometry.computeBoundingSphere();
  }

  public readonly chunk: Vector3;
  constructor(material: Material) {
    if (!TerrainChunk.geometry) {
      TerrainChunk.setupGeometry();
    }
    super(TerrainChunk.geometry!.clone(), material);
    this.castShadow = this.receiveShadow = true;
    this.matrixAutoUpdate = false;
    this.chunk = new Vector3();
  }

  private static aux: Vector3 = new Vector3();
  update(chunk: Vector3, getHeight: (position: Vector3) => number) {
    const { geometry, position: origin } = this;
    const { aux } = TerrainChunk;
    this.chunk.copy(chunk);
    origin.copy(chunk).multiplyScalar(TerrainChunk.size);
    const position = geometry.getAttribute('position');
    for (let i = 0; i < position.count; i++) {
      position.setY(i, getHeight(aux.fromBufferAttribute(position, i).add(origin)));
    }
    position.needsUpdate = true;
    this.position.copy(origin);
    this.updateMatrix();
    this.updateMatrixWorld();
  }
}

class Terrain extends Group {
  private static material: MeshStandardMaterial | undefined;
  static setupMaterial() {
    Terrain.material = new MeshStandardMaterial({
      map: loadTexture(DiffuseMap),
      normalMap: loadTexture(NormalMap),
      roughnessMap: loadTexture(RoughnessMap),
    });
    Terrain.material.map!.anisotropy = 16;
    Terrain.material.map!.colorSpace = SRGBColorSpace;
    [Terrain.material.map!, Terrain.material.normalMap!, Terrain.material.roughnessMap!].forEach((map) => {
      map.repeat.set(4, 4);
      map.wrapS = map.wrapT = RepeatWrapping;
    });
    Terrain.material.customProgramCacheKey = () => 'Terrain';
    Terrain.material.onBeforeCompile = (shader: Shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <clipping_planes_pars_vertex>',
          /* glsl */`
          #include <clipping_planes_pars_vertex>
          varying vec2 gridPosition;
          `
        )
        .replace(
          '#include <fog_vertex>',
          /* glsl */`
          #include <fog_vertex>
          gridPosition = vec3(modelMatrix * vec4(position, 1.0)).xz * 0.5;
          `
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <clipping_planes_pars_fragment>',
          /* glsl */`
          #include <clipping_planes_pars_fragment>
          varying vec2 gridPosition;
          float line(vec2 position) {
            vec2 coord = abs(fract(position - 0.5) - 0.5) / fwidth(position);
            return 1.0 - min(min(coord.x, coord.y), 1.0);
          }
          `
        )
        .replace(
          'vec4 diffuseColor = vec4( diffuse, opacity );',
          /* glsl */`
          float grid = 1.0 - line(gridPosition);
          vec4 diffuseColor = vec4(diffuse * grid, opacity);
          `
        );
    };
    return Terrain.material;
  }

  private readonly anchor: Vector3;
  private readonly map: Map<string, TerrainChunk>;
  private readonly noise: ImprovedNoise;
  private readonly pool: TerrainChunk[];

  constructor() {
    if (!Terrain.material) {
      Terrain.setupMaterial();
    }
    super();
    this.updateMatrixWorld();
    this.matrixAutoUpdate = false;
    this.getHeight = this.getHeight.bind(this);
    this.anchor = new Vector3(Infinity, Infinity, Infinity);
    this.map = new Map();
    this.noise = new ImprovedNoise();
    this.pool = [];
  }

  getHeight(position: Vector3) {
    const { noise } = this;
    let v = 0;
    let f = 0.03;
    let a = 0.5;
    for (let j = 0; j < 4; j++) {
      v += noise.noise(position.x * f, position.z * f, 0) * a;
      f *= 2;
      a *= 0.5;
    }
    return v * 16;
  }

  private static aux: Vector3 = new Vector3();
  private static center: Vector3 = new Vector3(TerrainChunk.size * 0.5, 0, TerrainChunk.size * 0.5);
  update(position: Vector3, radius: number) {
    const { anchor, children, map, pool } = this;
    const { aux, center } = Terrain;
    aux.copy(position).add(center).divideScalar(TerrainChunk.size).floor();
    aux.y = 0;
    if (anchor.equals(aux)) {
      return;
    }
    anchor.copy(aux);

    for (let i = 0, l = children.length; i < l; i++) {
      const child = children[i] as TerrainChunk;
      if (child.chunk.distanceTo(anchor) >= radius) {
        map.delete(`${child.chunk.x}:${child.chunk.z}`);
        pool.push(child);
        this.remove(child);
        i--;
        l--;
      }
    }

    for (let z = -radius; z <= radius; z++) {
      for (let x = -radius; x <= radius; x++) {
        aux.set(x, 0, z).add(anchor);
        if (aux.distanceTo(anchor) >= radius) {
          continue;
        }
        const key = `${aux.x}:${aux.z}`;
        if (!map.has(key)) {
          const chunk = pool.pop() || new TerrainChunk(Terrain.material!);
          chunk.update(aux, this.getHeight);
          map.set(key, chunk);
          this.add(chunk);
        }
      }
    }
  }
}

export default Terrain;
