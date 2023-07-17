import {
  EquirectangularReflectionMapping,
  PMREMGenerator,
  TextureLoader,
  WebGLRenderer,
} from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';

const loaders = {
  exr: new EXRLoader(),
  texture: new TextureLoader(),
};

let pmremGenerator: PMREMGenerator;
const getPMREMGenerator = (renderer: WebGLRenderer) => {
  if (!pmremGenerator) {
    pmremGenerator = new PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
  }
  return pmremGenerator;
};

let loading = 0;
const load = () => {
  if (loading === 0) {
    document.body.classList.add('loading');
  }
  loading++;
  return () => {
    loading--;
    if (loading === 0) {
      document.body.classList.remove('loading');
    }
  };
};

export const loadEnvironment = async (url: string, renderer: WebGLRenderer) => {
  const done = load();
  const pmrem = getPMREMGenerator(renderer);
  const background = await loaders.exr.loadAsync(url);
  background.mapping = EquirectangularReflectionMapping;
  done();
  return {
    background,
    environment: pmrem.fromEquirectangular(background).texture,
  };
};

export const loadTexture = (url: string) => {
  const texture = loaders.texture.load(url, load());
  return texture;
};
