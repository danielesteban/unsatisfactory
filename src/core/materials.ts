import {
  MeshStandardMaterial,
  MeshStandardMaterialParameters,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import { loadTexture } from '../textures';
import BeltDiffuseMap from '../textures/green_metal_rust_diff_1k.webp';
import BeltNormalMap from '../textures/green_metal_rust_nor_gl_1k.webp';
import BeltRoughnessMap from '../textures/green_metal_rust_rough_1k.webp';
import CoalDiffuseMap from '../textures/plastered_stone_wall_diff_1k.webp';
import CoalNormalMap from '../textures/plastered_stone_wall_nor_gl_1k.webp';
import CoalRoughnessMap from '../textures/plastered_stone_wall_rough_1k.webp';
import ConcreteDiffuseMap from '../textures/hexagonal_concrete_paving_diff_1k.webp';
import ConcreteNormalMap from '../textures/hexagonal_concrete_paving_nor_gl_1k.webp';
import ConcreteRoughnessMap from '../textures/hexagonal_concrete_paving_rough_1k.webp';
import CopperDiffuseMap from '../textures/rock_06_diff_1k.webp';
import CopperNormalMap from '../textures/rock_06_nor_gl_1k.webp';
import CopperRoughnessMap from '../textures/rock_06_rough_1k.webp';
import IronDiffuseMap from '../textures/rock_boulder_dry_diff_1k.webp';
import IronNormalMap from '../textures/rock_boulder_dry_nor_gl_1k.webp';
import IronRoughnessMap from '../textures/rock_boulder_dry_rough_1k.webp';
import RustDiffuseMap from '../textures/rust_coarse_01_diff_1k.webp';
import RustNormalMap from '../textures/rust_coarse_01_nor_gl_1k.webp';
import RustRoughnessMap from '../textures/rust_coarse_01_rough_1k.webp';

export const TexturedMaterial = (diffuse: string, normal: string, roughness: string, params: MeshStandardMaterialParameters = {}) => {
  const material = new MeshStandardMaterial({
    map: loadTexture(diffuse),
    normalMap: loadTexture(normal),
    roughnessMap: loadTexture(roughness),
    ...params,
  });
  material.map!.anisotropy = 16;
  material.map!.colorSpace = SRGBColorSpace;
  [material.map!, material.normalMap!, material.roughnessMap!].forEach((map) => {
    map.wrapS = map.wrapT = RepeatWrapping;
  });
  return material;
};

export const BeltMaterial = TexturedMaterial(
  BeltDiffuseMap,
  BeltNormalMap,
  BeltRoughnessMap,
  { metalness: 0.3 }
);

export const CoalMaterial = TexturedMaterial(
  CoalDiffuseMap,
  CoalNormalMap,
  CoalRoughnessMap,
  { roughness: 0.7 }
);

export const ConcreteMaterial = TexturedMaterial(
  ConcreteDiffuseMap,
  ConcreteNormalMap,
  ConcreteRoughnessMap
);

export const ConnectorsMaterial = new MeshStandardMaterial({
  color: 0x111111,
  roughness: 0.7,
});

export const CopperMaterial = TexturedMaterial(
  CopperDiffuseMap,
  CopperNormalMap,
  CopperRoughnessMap,
  { roughness: 0.7 }
);

export const IronMaterial = TexturedMaterial(
  IronDiffuseMap,
  IronNormalMap,
  IronRoughnessMap,
  { roughness: 0.7 }
);

export const RustMaterial = TexturedMaterial(
  RustDiffuseMap,
  RustNormalMap,
  RustRoughnessMap
);

export const WireMaterial = new MeshStandardMaterial({
  color: 0,
  roughness: 0.3,
});

export const ContainerMaterials = [RustMaterial, ConnectorsMaterial];
