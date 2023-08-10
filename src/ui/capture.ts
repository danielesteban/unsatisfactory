import {
  BufferGeometry,
  CubicBezierCurve3,
  ExtrudeGeometry,
  Material,
  Mesh,
  MeshBasicMaterial,
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

import { Brush } from '../core/brush';
import Buffers from '../objects/buffers';
import Belts from '../objects/belts';
import Fabricators from '../objects/fabricators';
import Foundations from '../objects/foundations';
import Generators from '../objects/generators';
import Miners from '../objects/miners';
import Poles from '../objects/poles';
import Smelters from '../objects/smelters';
import Walls from '../objects/walls';
import Wires from '../objects/wires';

let renderer: WebGLRenderer;
let camera: PerspectiveCamera;
let scene: Scene;
let composer: EffectComposer;
const setup = () => {
  if (renderer) {
    return;
  }
  const width = 256;
  const height = 256;
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

const queue: { brush: Brush; promises: ((capture: string[]) => void)[]; }[] = [];
const process = () => {
  setup();
  const queued = queue.shift();
  if (!queued) {
    return;
  }
  const { brush, promises } = queued;
  let geometry: BufferGeometry;
  let material: Material;
  switch (brush) {
    default:
      geometry = new BufferGeometry();
      material = new MeshBasicMaterial();
      break;
    case Brush.belt:
      geometry = new ExtrudeGeometry(Belts.getShape(), { bevelEnabled: false, depth: 4 });
      geometry.translate(0, 0, -2);
      geometry.rotateY(Math.PI * -0.5);
      geometry.rotateX(Math.PI * 0.5);
      material = Belts.getMaterial();
      break;
    case Brush.buffer:
      geometry = Buffers.getGeometry();
      material = Buffers.getMaterial();
      break;
    case Brush.fabricator:
      geometry = Fabricators.getGeometry();
      material = Fabricators.getMaterial();
      break;
    case Brush.foundation:
      geometry = Foundations.getGeometry();
      material = Foundations.getMaterial();
      break;
    case Brush.generator:
      geometry = Generators.getGeometry();
      material = Generators.getMaterial();
      break;
    case Brush.miner:
      geometry = Miners.getGeometry();
      material = Miners.getMaterial();
      break;
    case Brush.pole:
      geometry = Poles.getGeometry();
      material = Poles.getMaterial();
      break;
    case Brush.smelter:
      geometry = Smelters.getGeometry();
      material = Smelters.getMaterial();
      break;
    case Brush.wall:
      geometry = Walls.getGeometry();
      material = Walls.getMaterial();
      break;
    case Brush.wire: {
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
      geometry = new TubeGeometry(path, segments, 0.0625, 4, false);
      material = Wires.getMaterial();
      break;
    }
  }
  if (
    (
      (material as MeshStandardMaterial).map
      && !(material as MeshStandardMaterial).map?.image
    )
    || (
      (material as MeshStandardMaterial).normalMap
      && !(material as MeshStandardMaterial).normalMap?.image
    ) || (
      (material as MeshStandardMaterial).roughnessMap
      && !(material as MeshStandardMaterial).roughnessMap?.image
    )
  ) {
    queue.unshift(queued);
    requestAnimationFrame(process);
    return;
  }
  const mesh = new Mesh(geometry, material);
  scene.add(mesh);
  const capture = [6.5, 5.5].map((zoom) => {
    if (brush === Brush.belt || brush === Brush.buffer) {
      zoom -= 1.5;
    }
    if (brush === Brush.generator) {
      zoom *= 3.0;
    }
    if (brush === Brush.pole) {
      zoom += 0.5;
    }
    mesh.rotation.y = brush === Brush.generator ? Math.PI * 0.5 : 0;
    camera.position.set(0, 0.5, 1).multiplyScalar(zoom);
    camera.lookAt(0, 0, 0);
    composer.render();
    return renderer.domElement.toDataURL('jpg');
  });
  scene.remove(mesh);
  captures.set(brush, capture);
  promises.forEach((resolve) => resolve(capture));
  if (queue.length) {
    requestAnimationFrame(process);
  }
};

const captures = new Map();
export default (brush: Brush) => new Promise<string[]>((resolve) => {
  let capture = captures.get(brush);
  if (capture) {
    resolve(capture);
    return;
  }
  if (queue.length) {
    const queued = queue.find((q) => q.brush === brush);
    if (queued) {
      queued.promises.push(resolve);
    } else {
      queue.push({ brush, promises: [resolve] });
    }
    return;
  }
  queue.push({ brush, promises: [resolve] });
  requestAnimationFrame(process);
});
