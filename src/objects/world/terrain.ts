import RAPIER from '@dimforge/rapier3d-compat';
import {
  Group,
  Vector3,
} from 'three';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';
import { DepositItems } from '../../core/data';
import Physics from '../../core/physics';
import { ChunkSize } from './constants';
import Deposit from './deposit';
import Grass from './grass';
import Heightmap from './heightmap';

class TerrainSubChunk extends Group {
  public readonly heightmap: Heightmap;
  public readonly deposit?: Deposit;
  private readonly grass: Grass;
  private readonly terrain: Terrain;
  private lod: number;

  constructor(terrain: Terrain, lod: number = 1) {
    super();
    this.matrixAutoUpdate = false;
    this.lod = lod;
    this.terrain = terrain;
    this.heightmap = new Heightmap();
    this.add(this.heightmap);
    this.grass = new Grass(this.heightmap.geometry.boundingSphere!);
    this.add(this.grass);
    if (lod === 1) {
      this.deposit = new Deposit();
      this.add(this.deposit);
    }
  }

  update(origin: Vector3) {
    const { lod, deposit, grass, heightmap, position, terrain } = this;
    position.copy(origin);
    this.updateMatrix();
    this.updateMatrixWorld();
    heightmap.update(position, lod, terrain.getGrass, terrain.getHeight);
    grass.update(position, lod, terrain.getGrass, terrain.getHeight);
    if (deposit) {
      deposit.update(position, terrain.getDeposit, terrain.getHeight);
    }
  }
}

class TerrainChunk {
  public readonly chunk: Vector3;
  private lod: number;
  private readonly needsUpdate: { 1: boolean, 2: boolean };
  private readonly subchunks: { 1: TerrainSubChunk[], 2: TerrainSubChunk[] };
  private readonly terrain: Terrain;

  constructor(terrain: Terrain) {
    this.chunk = new Vector3();
    this.lod = 0;
    this.needsUpdate = { 1: true, 2: true };
    this.subchunks = {
      1: Array.from({ length: 4 }, () => new TerrainSubChunk(terrain)),
      2: [new TerrainSubChunk(terrain, 2)],
    };
    this.terrain = terrain;
  }

  setChunk(chunk: Vector3) {
    this.chunk.copy(chunk);
    this.needsUpdate[1] = this.needsUpdate[2] = true;
    this.reset();
  }

  private static readonly aux: Vector3 = new Vector3();
  private static readonly center: Vector3 = new Vector3(ChunkSize * 0.5, 0, ChunkSize * 0.5);
  private static readonly offsets: Vector3[] = [new Vector3(0, 0, 0), new Vector3(1, 0, 0), new Vector3(0, 0, 1), new Vector3(1, 0, 1)];
  setLOD(lod: 1 | 2) {
    if (this.lod === lod) {
      return false;
    }
    this.reset();
    this.lod = lod;
    const { chunk, subchunks, needsUpdate, terrain } = this;
    const { aux, center, offsets } = TerrainChunk;
    subchunks[lod].forEach((subchunk, i) => {
      terrain.add(subchunk);
      if (needsUpdate[lod]) {
        aux.copy(chunk);
        if (lod === 1) {
          aux.multiplyScalar(2).add(offsets[i]);
        }
        aux.multiplyScalar(ChunkSize).add(center).multiplyScalar(lod);
        subchunk.update(aux);
      }

      if (lod === 1) {
        const physics = terrain.getPhysics();
        physics.addCollider(
          subchunk,
          RAPIER.ColliderDesc
            .heightfield(
              ChunkSize,
              ChunkSize,
              subchunk.heightmap.heightmap,
              { x: ChunkSize, y: 1, z: ChunkSize }
            )
            .setTranslation(subchunk.position.x, subchunk.position.y, subchunk.position.z)
        );
        const { deposit } = subchunk;
        if (deposit && deposit.visible) {
          physics.addBody(
            deposit,
            RAPIER.RigidBodyDesc.fixed()
              .setTranslation(subchunk.position.x + deposit.position.x, subchunk.position.y + deposit.position.y, subchunk.position.z + deposit.position.z)
              .setRotation(deposit.quaternion),
            Deposit.getCollider()
          );
        }
      }
    });
    needsUpdate[lod] = false;
    return true;
  }

  reset() {
    const { subchunks, lod, terrain } = this;
    if (lod) {
      this.lod = 0;
      const physics = terrain.getPhysics();
      subchunks[lod as 1 | 2].forEach((subchunk) => {
        terrain.remove(subchunk);
        if (lod === 1) {
          physics.removeCollider(subchunk);
          if (subchunk.deposit) {
            physics.removeBody(subchunk.deposit);
          }
        }
      });
    }
  }
}

class Terrain extends Group {
  private readonly anchor: Vector3;
  private radius: number;
  private readonly map: Map<string, TerrainChunk>;
  private readonly noise: ImprovedNoise;
  private readonly physics: Physics;
  private readonly pool: TerrainChunk[];
  private step: number;

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
    this.step = -1;
  }

  getAnchor() {
    return this.anchor;
  }

  getDeposit(position: Vector3) {
    const { noise } = this;
    let v = noise.noise(position.z * 0.4, position.x * 0.4, 1234);
    v = Math.min(Math.max(v - 0.45, 0) * 5, 1);
    if (!v || this.getGrass(position) > -0.2) {
      return undefined;
    }
    v *= DepositItems.length;
    return {
      item: DepositItems[Math.min(Math.floor(v), DepositItems.length - 1)],
      purity: (v % 1) > 0.5 ? 1 : 2,
    };
  }

  getGrass(position: Vector3) {
    const { noise } = this;
    let v = 0;
    let f = 0.15;
    let a = 0.5;
    for (let j = 0; j < 3; j++) {
      v += noise.noise(position.x * f, position.z * f, -1337) * a;
      f *= 3;
      a *= 0.5;
    }
    return v - Math.max(this.getHeight(position) / 64, 0) * 0.5;
  }

  getHeight(position: Vector3) {
    const { noise } = this;
    let v = 0;
    let f = 0.006;
    let a = 0.8;
    let d = noise.noise(position.z * 0.008, position.x * 0.008, -2023);
    for (let j = 0; j < 4; j++) {
      v += noise.noise(position.x * f, position.z * f, d) * a;
      f *= 4;
      a *= 0.2;
    }
    return v * 64;
  }

  getPhysics() {
    return this.physics;
  }

  private static readonly aux: Vector3 = new Vector3();
  update(position: Vector3, radius: number) {
    const { anchor, map, pool } = this;
    const { aux } = Terrain;
    aux
      .copy(position)
      .divideScalar(ChunkSize * 2)
      .floor();
    aux.y = 0;

    if (anchor.equals(aux) && radius === this.radius) {
      this.updateStep();
      return;
    }
    anchor.copy(aux);
    this.radius = radius;

    const radiusSQ = radius ** 2;
    map.forEach((chunk) => {
      if (chunk.chunk.distanceToSquared(anchor) >= radiusSQ) {
        chunk.reset();
        map.delete(`${chunk.chunk.x}:${chunk.chunk.z}`);
        pool.push(chunk);
      }
    });
    this.step = 0;
    this.updateStep();
  }

  private updateStep(iteration: number = 0) {
    if (this.step === -1) {
      return;
    }
    const { anchor, map, pool, radius, step } = this;
    const { aux } = Terrain;
    const lodRadiusSQ = Math.max(Math.floor(radius * 0.5), 2) ** 2;
    const grid = Terrain.getRenderGrid(radius);
    const { offset, distSQ } = grid[step];
    const lod = distSQ >= lodRadiusSQ ? 2 : 1;

    aux.copy(offset).add(anchor);
    const key = `${aux.x}:${aux.z}`;
    let chunk = map.get(key);
    if (!chunk) {
      chunk = pool.pop() || new TerrainChunk(this);
      chunk.setChunk(aux);
      map.set(key, chunk);
    }
    if (chunk.setLOD(lod)) {
      iteration += lod === 1 ? 4 : 1;
    }

    this.step++;
    if (this.step >= grid.length) {
      this.step = -1;
    } else if (iteration < 2) {
      this.updateStep(iteration);
    }
  }

  private static readonly renderGrids: Map<number, { offset: Vector3, distSQ: number }[]> = new Map();
  static getRenderGrid(radius: number) {
    const { aux, renderGrids } = Terrain;
    let grid = renderGrids.get(radius);
    if (!grid) {
      grid = [];
      const radiusSQ = radius ** 2;
      for (let z = -radius + 1; z < radius; z++) {
        for (let x = -radius + 1; x < radius; x++) {
          aux.set(x, 0, z);
          const distSQ = aux.lengthSq();
          if (distSQ >= radiusSQ) {
            continue;
          }
          grid.push({ offset: aux.clone(), distSQ });
        }
      }
      grid.sort(({ distSQ: a }, { distSQ: b }) => a - b);
      renderGrids.set(radius, grid);
    }
    return grid;
  }
}

export default Terrain;
