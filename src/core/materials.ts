import {
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import { loadTexture } from '../textures';
import ConcreteDiffuseMap from '../textures/hexagonal_concrete_paving_diff_1k.webp';
import ConcreteNormalMap from '../textures/hexagonal_concrete_paving_nor_gl_1k.webp';
import ConcreteRoughnessMap from '../textures/hexagonal_concrete_paving_rough_1k.webp';
import MetalDiffuseMap from '../textures/green_metal_rust_diff_1k.webp';
import MetalNormalMap from '../textures/green_metal_rust_nor_gl_1k.webp';
import MetalRoughnessMap from '../textures/green_metal_rust_rough_1k.webp';
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

let metal: MeshStandardMaterial | undefined;
export const MetalMaterial = () => {
  if (!metal) {
    metal = TexturedMaterial(
      MetalDiffuseMap,
      MetalNormalMap,
      MetalRoughnessMap
    );
    metal.metalness = 0.3;
  }
  return metal;
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

let container: MeshStandardMaterial[] | undefined;
export const ContainerMaterials = () => {
  if (!container) {
    container = [RustMaterial(), ConnectorsMaterial()]
  }
  return container;
};
