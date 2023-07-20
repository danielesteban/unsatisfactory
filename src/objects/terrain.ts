import {
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  Shader,
  ShaderChunk,
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
  private static center: Vector3 = new Vector3();
  update(chunk: Vector3, getHeight: (position: Vector3) => number) {
    const { geometry, position: origin } = this;
    const { aux, center } = TerrainChunk;
    this.chunk.copy(chunk);
    origin.copy(chunk).multiplyScalar(TerrainChunk.size);
    const position = geometry.getAttribute('position');
    let maxRadiusSq = 0;
    for (let i = 0; i < position.count; i++) {
      position.setY(i, getHeight(aux.fromBufferAttribute(position, i).add(origin)));
      maxRadiusSq = Math.max(maxRadiusSq, center.distanceToSquared(aux.fromBufferAttribute(position, i)));
    }
    geometry.boundingSphere!.radius = Math.sqrt(maxRadiusSq);
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
          varying vec3 gridPosition;
          `
        )
        .replace(
          '#include <fog_vertex>',
          /* glsl */`
          #include <fog_vertex>
          gridPosition = vec3(modelMatrix * vec4(position, 1.0));
          `
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <clipping_planes_pars_fragment>',
          /* glsl */`
          #include <clipping_planes_pars_fragment>
          varying vec3 gridPosition;
          float line(vec2 position) {
            vec2 coord = abs(fract(position - 0.5) - 0.5) / fwidth(position);
            return 1.0 - min(min(coord.x, coord.y), 1.0);
          }
          float directNoise(vec2 p) {
            vec2 ip = floor(p);
            vec2 u = fract(p);
            u = u*u*(3.0-2.0*u);
            float res = mix(
              mix(rand(ip),rand(ip+vec2(1.0,0.0)),u.x),
              mix(rand(ip+vec2(0.0,1.0)),rand(ip+vec2(1.0,1.0)),u.x),
              u.y
            );
            return res*res;
          }
          float sum(vec4 v) { return v.x+v.y+v.z; }
          vec4 textureNoTile(sampler2D mapper, in vec2 uv) {
            // sample variation pattern
            float k = directNoise(uv);
            // compute index
            float index = k*8.0;
            float f = fract(index);
            float ia = floor(index);
            float ib = ia + 1.0;

            // offsets for the different virtual patterns
            vec2 offa = sin(vec2(3.0,7.0)*ia); // can replace with any other hash
            vec2 offb = sin(vec2(3.0,7.0)*ib); // can replace with any other hash

            // compute derivatives for mip-mapping
            vec2 dx = dFdx(uv);
            vec2 dy = dFdy(uv);

            // sample the two closest virtual patterns
            vec4 cola = textureGrad(mapper, uv + offa, dx, dy);
            vec4 colb = textureGrad(mapper, uv + offb, dx, dy);

            // interpolate between the two virtual patterns
            return mix(cola, colb, smoothstep(0.2,0.8,f-0.1*sum(cola-colb)));
          }
          `
        )
        .replace(
          '#include <map_fragment>',
          ShaderChunk.map_fragment.replace(/texture2D/g, 'textureNoTile')
        )
        .replace(
          '#include <normal_fragment_maps>',
          ShaderChunk.normal_fragment_maps.replace(/texture2D/g, 'textureNoTile')
        )
        .replace(
          '#include <roughnessmap_fragment>',
          ShaderChunk.roughnessmap_fragment.replace(/texture2D/g, 'textureNoTile')
        )
        .replace(
          'vec4 diffuseColor = vec4( diffuse, opacity );',
          /* glsl */`
          float depth = distance(gridPosition, cameraPosition);
          float decay = exp(-0.01 * 0.01 * depth * depth);
          float grid = 1.0 - line(gridPosition.xz * 0.5) * decay;
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

    for (let z = -radius + 1; z < radius; z++) {
      for (let x = -radius + 1; x < radius; x++) {
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
