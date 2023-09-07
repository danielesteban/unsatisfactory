import RAPIER from '@dimforge/rapier3d-compat';
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
import Physics from '../core/physics';
import Deposit from './deposit';
import Grass from './grass';
import { loadTexture } from '../textures';
import DiffuseMap from '../textures/coast_sand_rocks_02_diff_1k.webp';
import NormalMap from '../textures/coast_sand_rocks_02_nor_gl_1k.webp';
import RoughnessMap from '../textures/coast_sand_rocks_02_rough_1k.webp';

export class TerrainChunk extends Mesh {
  public static readonly size: number = 16;

  private static geometry: PlaneGeometry | undefined;
  static getGeometry() {
    if (!TerrainChunk.geometry) {
      const geometry = new PlaneGeometry(TerrainChunk.size, TerrainChunk.size, TerrainChunk.size, TerrainChunk.size);
      geometry.rotateX(Math.PI * -0.5);
      geometry.computeBoundingSphere();
      TerrainChunk.geometry = geometry;
    }
    return TerrainChunk.geometry;
  }

  public readonly chunk: Vector3;
  public readonly heightmap: Float32Array;
  public readonly deposit: Deposit;
  public readonly grass: Grass;
  constructor(material: Material) {
    super(TerrainChunk.getGeometry().clone(), material);
    this.castShadow = this.receiveShadow = true;
    this.matrixAutoUpdate = false;
    this.chunk = new Vector3();
    this.heightmap = new Float32Array((TerrainChunk.size + 1) * (TerrainChunk.size + 1));
    this.deposit = new Deposit();
    this.add(this.deposit);
    this.grass = new Grass(this.geometry.boundingSphere!);
    this.add(this.grass);
  }

  private static readonly aux: Vector3 = new Vector3();
  private static readonly center: Vector3 = new Vector3();
  update(chunk: Vector3, getHeight: (position: Vector3) => number) {
    const { deposit, geometry, grass, heightmap, position: origin } = this;
    const { aux, center } = TerrainChunk;
    this.chunk.copy(chunk);
    origin.copy(chunk).multiplyScalar(TerrainChunk.size);
    const position = geometry.getAttribute('position');
    for (let i = 0, x = 0; x < (TerrainChunk.size + 1); x++) {
      for (let z = 0; z < (TerrainChunk.size + 1); z++, i++) {
        heightmap[i] = getHeight(aux.set(x - TerrainChunk.size * 0.5, 0, z - TerrainChunk.size * 0.5).add(origin));
      }
    }
    let maxRadiusSq = 0;
    for (let i = 0; i < position.count; i++) {
      aux.fromBufferAttribute(position, i);
      aux.y = heightmap[
        Math.floor(aux.x + TerrainChunk.size * 0.5) * (TerrainChunk.size + 1)
        + Math.floor(aux.z + TerrainChunk.size * 0.5)
      ];
      position.setY(i, aux.y);
      maxRadiusSq = Math.max(maxRadiusSq, center.distanceToSquared(aux));
    }
    geometry.boundingSphere!.radius = Math.sqrt(maxRadiusSq);
    position.needsUpdate = true;
    deposit.visible = grass.visible = false;
    this.updateMatrix();
    this.updateMatrixWorld();
  }

  updateDeposit(getDeposit: (position: Vector3) => number, getGrass: (position: Vector3) => number, getHeight: (position: Vector3) => number) {
    const { deposit, position } = this;
    deposit.update(position, getDeposit, getGrass, getHeight);
  }

  updateGrass(getGrass: (position: Vector3) => number, getHeight: (position: Vector3) => number) {
    const { grass, position } = this;
    grass.update(position, getGrass, getHeight);
    grass.updateMatrixWorld();
  }
}

class Terrain extends Group {
  private static material: MeshStandardMaterial | undefined;
  static getMaterial() {
    if (!Terrain.material) {
      const material = new MeshStandardMaterial({
        map: loadTexture(DiffuseMap),
        normalMap: loadTexture(NormalMap),
        roughnessMap: loadTexture(RoughnessMap),
      });
      material.map!.anisotropy = 16;
      material.map!.colorSpace = SRGBColorSpace;
      [material.map!, material.normalMap!, material.roughnessMap!].forEach((map) => {
        map.repeat.set(4, 4);
        map.wrapS = map.wrapT = RepeatWrapping;
      });
      material.customProgramCacheKey = () => 'Terrain';
      material.onBeforeCompile = (shader: Shader) => {
        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <clipping_planes_pars_fragment>',
            /* glsl */`
            #include <clipping_planes_pars_fragment>
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
              vec2 offa = sin(vec2(3.0,7.0)*ia);
              vec2 offb = sin(vec2(3.0,7.0)*ib);

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
          );
      };
      Terrain.material = material;
    }
    return Terrain.material;
  }

  private readonly anchor: Vector3;
  private radius: number;
  private readonly map: Map<string, TerrainChunk>;
  private readonly noise: ImprovedNoise;
  private readonly physics: Physics;
  private readonly pool: TerrainChunk[];
  private readonly queue: TerrainChunk[];

  constructor(physics: Physics) {
    super();
    this.updateMatrixWorld();
    this.matrixAutoUpdate = false;
    this.getDeposit = this.getDeposit.bind(this);
    this.getGrass = this.getGrass.bind(this);
    this.getHeight = this.getHeight.bind(this);
    this.anchor = new Vector3(Infinity, Infinity, Infinity);
    this.radius = 0;
    this.map = new Map();
    this.noise = new ImprovedNoise();
    this.physics = physics;
    this.pool = [];
    this.queue = [];
  }

  getDeposit(position: Vector3) {
    const { noise } = this;
    let v = 0;
    let f = 0.3;
    let a = 0.5;
    for (let j = 0; j < 3; j++) {
      v += noise.noise(position.x * f, position.z * f, 1337) * a;
      f *= 2;
      a *= 0.5;
    }
    return v;
  }

  getGrass(position: Vector3) {
    const { noise } = this;
    let v = 0;
    let f = 0.15;
    let a = 0.5;
    for (let j = 0; j < 3; j++) {
      v += noise.noise(position.x * f, position.z * f, -1337) * a;
      f *= 2;
      a *= 0.5;
    }
    return v;
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

  private static readonly aux: Vector3 = new Vector3();
  private static readonly center: Vector3 = new Vector3(TerrainChunk.size * 0.5, 0, TerrainChunk.size * 0.5);
  update(position: Vector3, radius: number) {
    const { anchor, children, map, physics, pool, queue } = this;
    const { aux, center } = Terrain;
    aux.copy(position).add(center).divideScalar(TerrainChunk.size).floor();
    aux.y = 0;
    if (anchor.equals(aux) && radius === this.radius) {
      for (let i = 0, l = Math.min(queue.length, 4); i < l; i++) {
        const queued = queue.shift()!;
        queued.updateDeposit(this.getDeposit, this.getGrass, this.getHeight);
        queued.updateGrass(this.getGrass, this.getHeight);
        if (queued.deposit.visible) {
          physics.addBody(
            queued.deposit,
            RAPIER.RigidBodyDesc.fixed()
              .setTranslation(queued.position.x + queued.deposit.position.x, queued.position.y + queued.deposit.position.y, queued.position.z + queued.deposit.position.z)
              .setRotation(queued.deposit.quaternion),
            Deposit.getCollider()
          );
        }
      }
      return;
    }
    anchor.copy(aux);
    this.radius = radius;

    const radiusSQ = radius ** 2;
    for (let i = 0, l = children.length; i < l; i++) {
      const child = children[i] as TerrainChunk;
      if (child.chunk.distanceToSquared(anchor) >= radiusSQ) {
        map.delete(`${child.chunk.x}:${child.chunk.z}`);
        physics.removeCollider(child);
        physics.removeBody(child.deposit);
        pool.push(child);
        this.remove(child);
        const queued = queue.indexOf(child);
        if (queued !== -1) {
          queue.splice(queued, 1);
        }
        i--;
        l--;
      }
    }

    Terrain.getRenderGrid(radius).forEach((offset) => {
      aux.copy(offset).add(anchor);
      const key = `${aux.x}:${aux.z}`;
      if (!map.has(key)) {
        const chunk = pool.pop() || new TerrainChunk(Terrain.getMaterial());
        chunk.update(aux, this.getHeight);
        physics.addCollider(
          chunk,
          RAPIER.ColliderDesc
            .heightfield(
              TerrainChunk.size,
              TerrainChunk.size,
              chunk.heightmap,
              { x: TerrainChunk.size, y: 1, z: TerrainChunk.size }
            )
            .setTranslation(chunk.position.x, chunk.position.y, chunk.position.z)
        );
        physics.removeBody(chunk.deposit);
        map.set(key, chunk);
        queue.push(chunk);
        this.add(chunk);
      }
    });
  }

  private static readonly renderGrids: Map<number, Vector3[]> = new Map();
  private static getRenderGrid(radius: number) {
    const { aux, renderGrids } = Terrain;
    let grid = renderGrids.get(radius);
    if (!grid) {
      const chunks = [];
      for (let z = -radius + 1; z < radius; z++) {
        for (let x = -radius + 1; x < radius; x++) {
          aux.set(x, 0, z);
          const dist = aux.length();
          if (dist >= radius) {
            continue;
          }
          chunks.push({ offset: aux.clone(), dist });
        }
      }
      chunks.sort(({ dist: a }, { dist: b }) => a - b);
      grid = chunks.map(({ offset }) => offset);
      renderGrids.set(radius, grid);
    }
    return grid;
  }
}

export default Terrain;
