import {
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import { loadTexture } from '../textures';
import BeltDiffuseMap from '../textures/green_metal_rust_diff_1k.webp';
import BeltNormalMap from '../textures/green_metal_rust_nor_gl_1k.webp';
import BeltRoughnessMap from '../textures/green_metal_rust_rough_1k.webp';
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

export const TexturedMaterial = (diffuse: string, normal: string, roughness: string) => {
  const material = new MeshStandardMaterial({
    map: loadTexture(diffuse),
    normalMap: loadTexture(normal),
    roughnessMap: loadTexture(roughness),
  });
  material.map!.anisotropy = 16;
  material.map!.colorSpace = SRGBColorSpace;
  [material.map!, material.normalMap!, material.roughnessMap!].forEach((map) => {
    map.wrapS = map.wrapT = RepeatWrapping;
  });
  return material;
};

let belt: MeshStandardMaterial | undefined;
export const BeltMaterial = () => {
  if (!belt) {
    belt = TexturedMaterial(
      BeltDiffuseMap,
      BeltNormalMap,
      BeltRoughnessMap
    );
    belt.metalness = 0.3;
  }
  return belt;
};

let concrete: MeshStandardMaterial | undefined;
export const ConcreteMaterial = () => {
  if (!concrete) {
    concrete = TexturedMaterial(
      ConcreteDiffuseMap,
      ConcreteNormalMap,
      ConcreteRoughnessMap
    );
  }
  return concrete;
};

let connectors: MeshStandardMaterial | undefined;
export const ConnectorsMaterial = () => {
  if (!connectors) {
    connectors = new MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.7,
    });
  }
  return connectors;
};

let copper: MeshStandardMaterial | undefined;
export const CopperMaterial = () => {
  if (!copper) {
    copper = TexturedMaterial(
      CopperDiffuseMap,
      CopperNormalMap,
      CopperRoughnessMap
    );
    copper.roughness = 0.7;
  }
  return copper;
};

let container: MeshStandardMaterial[] | undefined;
export const ContainerMaterials = () => {
  if (!container) {
    container = [RustMaterial(), ConnectorsMaterial()]
  }
  return container;
};

let iron: MeshStandardMaterial | undefined;
export const IronMaterial = () => {
  if (!iron) {
    iron = TexturedMaterial(
      IronDiffuseMap,
      IronNormalMap,
      IronRoughnessMap
    );
    iron.roughness = 0.7;
  }
  return iron;
};

let rust: MeshStandardMaterial | undefined;
export const RustMaterial = () => {
  if (!rust) {
    rust = TexturedMaterial(
      RustDiffuseMap,
      RustNormalMap,
      RustRoughnessMap
    );
  }
  return rust;
};

let wire: MeshStandardMaterial | undefined;
export const WireMaterial = () => {
  if (!wire) {
    wire = new MeshStandardMaterial({
      color: 0,
      roughness: 0.3,
    });
  }
  return wire;
};
