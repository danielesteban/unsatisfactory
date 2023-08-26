import {
  BufferGeometry,
  CubicBezierCurve3,
  ExtrudeGeometry,
  Material,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  TubeGeometry,
  Vector3,
  WebGLRenderer,
} from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
// @ts-ignore
import { N8AOPass } from 'n8ao';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Brush, getGeometry, getMaterial } from '../core/brush';
import Belts from '../objects/belts';
import Items, { Item } from '../objects/items';

const width = 256;
const height = 256;

let camera: PerspectiveCamera;
let composer: EffectComposer;
let geometries: Partial<Record<Brush, BufferGeometry>>;
let renderer: WebGLRenderer;
let scene: Scene;

const setupGeometries = () => {
  if (geometries) {
    return;
  }
  geometries = {
    [Brush.belt]: (() => {
      const geometry = new ExtrudeGeometry(Belts.getShape(), { bevelEnabled: false, depth: 4 });
      geometry.translate(0, 0, -2);
      geometry.rotateY(Math.PI * -0.5);
      geometry.rotateX(Math.PI * 0.5);
      return geometry;
    })(),
    [Brush.wire]: (() => {
      const from = new Vector3(-2, -2, 0);
      const to = new Vector3(2, 2, 0);
      const offset = from.distanceTo(to) * 0.5;
      const path = new CubicBezierCurve3(
        from,
        from.clone().addScaledVector(new Vector3(1, 0, 0), offset),
        to.clone().addScaledVector(new Vector3(-1, 0, 0), offset),
        to
      );
      const segments = Math.ceil(path.getLength() / 0.1);
      return new TubeGeometry(path, segments, 0.0625, 4, false);
    })(),
  };
};

const setupRenderer = () => {
  if (renderer) {
    return;
  }
  renderer = new WebGLRenderer({
    preserveDrawingBuffer: true,
  });
  renderer.setSize(width, height);
  renderer.setClearAlpha(0);
  scene = new Scene();
  scene.environment = (new PMREMGenerator(renderer)).fromScene(new RoomEnvironment(), 0.04).texture;
  camera = new PerspectiveCamera(60, width / height, 0.1, 1000);
  composer = new EffectComposer(renderer);
  composer.addPass(new N8AOPass(
    scene,
    camera,
    width,
    height
  ));
  composer.addPass(new SMAAPass(width, height));
};

const captures = {
  brush: new Map<Brush, string[]>(),
  item: new Map<Item, string[]>(),
};

const queues: {
  brush: { brush: Brush; promises: ((capture: string[]) => void)[]; }[];
  item: { item: Exclude<Item, Item.none>; promises: ((capture: string[]) => void)[]; }[];
} = {
  brush: [],
  item: [],
};

const isLoading = (material: MeshStandardMaterial) => (
  (
    material.map
    && !material.map?.image
  )
  || (
    material.normalMap
    && !material.normalMap?.image
  ) || (
    material.roughnessMap
    && !material.roughnessMap?.image
  )
);

const processBrushQueue = () => {
  const queued = queues.brush.shift();
  if (!queued) {
    return;
  }
  const { brush, promises } = queued;
  const material: Material = getMaterial(brush);
  if (isLoading(material as MeshStandardMaterial)) {
    queues.brush.unshift(queued);
    requestAnimationFrame(processBrushQueue);
    return;
  }
  setupGeometries();
  setupRenderer();
  const mesh = new Mesh(
    geometries[brush] || getGeometry(brush),
    material
  );
  scene.add(mesh);
  const capture = [6.5, 5.5].map((zoom) => {
    if (brush === Brush.belt || brush === Brush.buffer) {
      zoom -= 1.5;
    }
    if (brush === Brush.generator) {
      zoom *= 3.0;
    }
    if (brush === Brush.pillar || brush === Brush.pole || brush === Brush.sink) {
      zoom += 0.5;
    }
    mesh.rotation.y = brush === Brush.generator ? Math.PI * 0.5 : 0;
    camera.position.set(0, 0.5, 1).multiplyScalar(zoom);
    camera.lookAt(0, 0.125, 0);
    composer.render();
    return renderer.domElement.toDataURL();
  });
  scene.remove(mesh);
  captures.brush.set(brush, capture);
  promises.forEach((resolve) => resolve(capture));
  if (queues.brush.length) {
    requestAnimationFrame(processBrushQueue);
  }
};

const processItemQueue = () => {
  const queued = queues.item.shift();
  if (!queued) {
    return;
  }
  const { item, promises } = queued;
  const material: Material = Items.setupMaterials()[item];
  if (isLoading(material as MeshStandardMaterial)) {
    queues.item.unshift(queued);
    requestAnimationFrame(processItemQueue);
    return;
  }
  setupRenderer();
  const mesh = new Mesh(
    Items.setupGeometries()[item],
    material
  );
  scene.add(mesh);
  const capture = [1, 0.75].map((zoom) => {
    camera.position.set(0, 0.5, 1).multiplyScalar(zoom);
    camera.lookAt(0, 0, 0);
    composer.render();
    return renderer.domElement.toDataURL();
  });
  scene.remove(mesh);
  captures.item.set(item, capture);
  promises.forEach((resolve) => resolve(capture));
  if (queues.item.length) {
    requestAnimationFrame(processItemQueue);
  }
};

export const captureBrush = (brush: Brush) => new Promise<string[]>((resolve) => {
  let capture = captures.brush.get(brush);
  if (capture) {
    resolve(capture);
    return;
  }
  if (queues.brush.length) {
    const queued = queues.brush.find((q) => q.brush === brush);
    if (queued) {
      queued.promises.push(resolve);
    } else {
      queues.brush.push({ brush, promises: [resolve] });
    }
    return;
  }
  queues.brush.push({ brush, promises: [resolve] });
  requestAnimationFrame(processBrushQueue);
});

export const captureItem = (item: Exclude<Item, Item.none>) => new Promise<string[]>((resolve) => {
  let capture = captures.item.get(item);
  if (capture) {
    resolve(capture);
    return;
  }
  if (queues.item.length) {
    const queued = queues.item.find((q) => q.item === item);
    if (queued) {
      queued.promises.push(resolve);
    } else {
      queues.item.push({ item, promises: [resolve] });
    }
    return;
  }
  queues.item.push({ item, promises: [resolve] });
  requestAnimationFrame(processItemQueue);
});

