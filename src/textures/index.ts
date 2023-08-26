import {
  EquirectangularReflectionMapping,
  PMREMGenerator,
  Texture,
  WebGLRenderer,
} from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';

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

let pmremGenerator: PMREMGenerator;
const getPMREMGenerator = (renderer: WebGLRenderer) => {
  if (!pmremGenerator) {
    pmremGenerator = new PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
  }
  return pmremGenerator;
};

export const loadEnvironment = async (url: string, renderer: WebGLRenderer) => {
  const done = load();
  const pmrem = getPMREMGenerator(renderer);
  const background = await (new EXRLoader()).loadAsync(url);
  background.mapping = EquirectangularReflectionMapping;
  done();
  return {
    background,
    environment: pmrem.fromEquirectangular(background).texture,
  };
};

const images = {
  loaded: new Map<string, HTMLImageElement>(),
  queue: new Map<string, ((image: HTMLImageElement) => void)[]>,
};

const loadImage = (url: string) => new Promise((resolve) => {
  const loaded = images.loaded.get(url);
  if (loaded) {
    resolve(loaded);
    return;
  }
  let queue = images.queue.get(url);
  if (!queue) {
    queue = [];
    images.queue.set(url, queue);
    const done = load();
    const image = new Image();
    image.addEventListener('load', () => {
      images.queue.delete(url);
      images.loaded.set(url, image);
      queue!.forEach((resolve) => resolve(image));
      done();
    });
    image.src = url;
  }
  queue.push(resolve);
});

export const loadTexture = (url: string) => {
  const texture = new Texture();
  loadImage(url).then((image) => {
    texture.image = image;
    texture.needsUpdate = true;
  });
  return texture;
};
