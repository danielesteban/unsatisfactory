import RAPIER from '@dimforge/rapier3d-compat';
import {
  BufferAttribute,
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
import { Item } from '../core/data';
import Physics from '../core/physics';
import Deposit from './deposit';
import Grass from './grass';
import { loadTexture } from '../textures';
import DiffuseColdMap from '../textures/coast_sand_rocks_02_diff_1k.webp';
import NormalColdMap from '../textures/coast_sand_rocks_02_nor_gl_1k.webp';
import RoughnessColdMap from '../textures/coast_sand_rocks_02_rough_1k.webp';
import DiffuseWarmMap from '../textures/sand_01_diff_1k.webp';
import NormalWarmMap from '../textures/sand_01_nor_gl_1k.webp';
import RoughnessWarmMap from '../textures/sand_01_rough_1k.webp';

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
  public readonly heatmap: Float32Array;
  public readonly heightmap: Float32Array;
  public readonly deposit: Deposit;
  public readonly grass: Grass;
  constructor(material: Material) {
    super(TerrainChunk.getGeometry().clone(), material);
    this.geometry.setAttribute('heat', new BufferAttribute(new Float32Array(this.geometry.getAttribute('position').count), 1));
    this.castShadow = this.receiveShadow = true;
    this.matrixAutoUpdate = false;
    this.chunk = new Vector3();
    this.heatmap = new Float32Array((TerrainChunk.size + 1) * (TerrainChunk.size + 1));
    this.heightmap = new Float32Array((TerrainChunk.size + 1) * (TerrainChunk.size + 1));
    this.deposit = new Deposit();
    this.add(this.deposit);
    this.grass = new Grass(this.geometry.boundingSphere!);
    this.add(this.grass);
  }

  private static readonly aux: Vector3 = new Vector3();
  private static readonly center: Vector3 = new Vector3();
  update(chunk: Vector3, getGrass: (position: Vector3) => number, getHeight: (position: Vector3) => number) {
    const { deposit, geometry, grass, heatmap, heightmap, position: origin } = this;
    const { aux, center } = TerrainChunk;
    this.chunk.copy(chunk);
    origin.copy(chunk).multiplyScalar(TerrainChunk.size);
    const heat = geometry.getAttribute('heat');
    const position = geometry.getAttribute('position');
    for (let i = 0, x = 0; x < (TerrainChunk.size + 1); x++) {
      for (let z = 0; z < (TerrainChunk.size + 1); z++, i++) {
        aux.set(x - TerrainChunk.size * 0.5, 0, z - TerrainChunk.size * 0.5).add(origin);
        heatmap[i] = getGrass(aux) + 1;
        heightmap[i] = getHeight(aux);
      }
    }
    let maxRadiusSq = 0;
    for (let i = 0; i < position.count; i++) {
      aux.fromBufferAttribute(position, i);
      const index = (
        Math.floor(aux.x + TerrainChunk.size * 0.5) * (TerrainChunk.size + 1)
        + Math.floor(aux.z + TerrainChunk.size * 0.5)
      );
      heat.setX(i, heatmap[index]);
      aux.y = heightmap[index];
      position.setY(i, aux.y);
      maxRadiusSq = Math.max(maxRadiusSq, center.distanceToSquared(aux));
    }
    geometry.boundingSphere!.radius = Math.sqrt(maxRadiusSq);
    heat.needsUpdate = position.needsUpdate = true;
    deposit.visible = grass.visible = false;
    this.updateMatrix();
    this.updateMatrixWorld();
  }

  updateDeposit(getDeposit: (position: Vector3) => { item: Item, purity: number } | undefined, getHeight: (position: Vector3) => number) {
    const { deposit, position } = this;
    deposit.update(position, getDeposit, getHeight);
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
      }
      const material = new MeshStandardMaterial({
        ...textures.cold,
      });
      [textures.cold, textures.warm].forEach((textures) => {
        textures.map!.anisotropy = 16;
        textures.map!.colorSpace = SRGBColorSpace;
        [textures.map!, textures.normalMap!, textures.roughnessMap!].forEach((map) => {
          map.repeat.set(4, 4);
          map.wrapS = map.wrapT = RepeatWrapping;
        });
      })
      material.customProgramCacheKey = () => 'Terrain';
      material.onBeforeCompile = (shader: Shader) => {
        shader.uniforms.mapB = { value: textures.warm.map };
        shader.uniforms.normalMapB = { value: textures.warm.normalMap };
        shader.uniforms.roughnessMapB = { value: textures.warm.roughnessMap };
        shader.vertexShader = shader.vertexShader
          .replace(
            '#include <clipping_planes_pars_vertex>',
            /* glsl */`
            #include <clipping_planes_pars_vertex>
            attribute float heat;
            varying float vHeat;
            `
          )
          .replace(
            '#include <clipping_planes_vertex>',
            /* glsl */`
            #include <clipping_planes_vertex>
            vHeat = heat;
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
            varying float vHeat;
            vec4 textureHeat(sampler2D mapperA, sampler2D mapperB, in vec2 uv) {
              return mix(texture2D(mapperA, uv), texture2D(mapperB, uv), clamp(vHeat, 0.0, 1.0));
            }
            `
          )
          .replace(
            '#include <map_fragment>',
            ShaderChunk.map_fragment.replace(/texture2D\(/g, 'textureHeat(mapB,')
          )
          .replace(
            '#include <normal_fragment_maps>',
            ShaderChunk.normal_fragment_maps.replace(/texture2D\(/g, 'textureHeat(normalMapB,')
          )
          .replace(
            '#include <roughnessmap_fragment>',
            ShaderChunk.roughnessmap_fragment.replace(/texture2D\(/g, 'textureHeat(roughnessMapB,')
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

  getAnchor() {
    return this.anchor;
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
    v = Math.min(Math.max(Math.abs(v) - 0.2, 0) * 5, 1);
    if (!v || this.getGrass(position) > -0.2) {
      return undefined;
    }
    const d = (v * v) * 3;
    return {
      item: [Item.ironOre, Item.copperOre, Item.coal][Math.min(Math.floor(d), 2)] as (Item.ironOre | Item.copperOre | Item.coal),
      purity: (d % 1) > 0.5 ? 1 : 2,
    };
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
        queued.updateDeposit(this.getDeposit, this.getHeight);
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
        chunk.update(aux, this.getGrass, this.getHeight);
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
  static getRenderGrid(radius: number) {
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
