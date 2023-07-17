import {
  ACESFilmicToneMapping,
  Clock,
  EventDispatcher,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { CSM } from 'three/examples/jsm/csm/CSM.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
// @ts-ignore
import { N8AOPass } from 'n8ao';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import Controls from './controls';
import { loadEnvironment } from '../textures';
// @ts-ignore
import Environment from '../textures/netball_court_1k.exr';

class Viewport extends EventDispatcher {
  private static readonly ResizeEvent = { type: 'resize' };
  private animate?: (buttons: { primary: boolean; secondary: boolean; tertiary: boolean; }, delta: number, time: number) => void;
  private readonly clock: Clock;
  private readonly composer: EffectComposer;
  public readonly camera: PerspectiveCamera;
  public readonly controls: Controls;
  public readonly csm: CSM;
  public readonly dom: HTMLElement;
  public readonly renderer: WebGLRenderer;
  public readonly scene: Scene;

  constructor() {
    super();
    const dom = document.getElementById('viewport');
    if (!dom) {
      throw new Error('Couldn\'t get viewport');
    }
    this.dom = dom;
    
    this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.clock = new Clock();
    this.controls = new Controls(this.camera, dom);
    this.renderer = new WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.7;
    this.scene = new Scene();
    this.scene.backgroundBlurriness = 0.3;
    loadEnvironment(Environment, this.renderer).then(({ background, environment }) => {
      this.scene.background = background;
      this.scene.environment = environment;
    });
    this.csm = new CSM({
      camera: this.camera,
      cascades: 4,
      lightDirection: (new Vector3(0.5, -1, -0.25)).normalize(),
      maxFar: 1000,
      mode: 'practical' as any,
      parent: this.scene,
      shadowMapSize: 2048,
    });
    this.csm.fade = true;
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new N8AOPass(
      this.scene,
      this.camera,
      window.innerWidth,
      window.innerHeight
    ));
    this.composer.addPass(new SMAAPass(window.innerWidth, window.innerHeight));

    this.resize();
    window.addEventListener('resize', this.resize.bind(this));
    dom.appendChild(this.renderer.domElement);

    document.addEventListener('visibilitychange', () => (
      document.visibilityState === 'visible' && this.clock.start()
    ));
    this.renderer.setAnimationLoop(this.render.bind(this));
  }
  
  setAnimationLoop(animate: (buttons: { primary: boolean; secondary: boolean; tertiary: boolean; }, delta: number, time: number) => void) {
    this.animate = animate;
    this.clock.start();
  }

  private render() {
    const { clock, composer, controls, csm } = this;
    if (!this.animate) {
      return;
    }
    const delta = Math.min(clock.getDelta(), 0.2);
    const time = clock.oldTime / 1000;
    controls.update(delta);
    this.animate(controls.buttons, delta, time);
    controls.buttons.primary = false;
    controls.buttons.secondary = false;
    controls.buttons.tertiary = false;
    csm.update();
    composer.render();
  }

  private resize() {
    const { camera, composer, csm, renderer } = this;
    const { innerWidth: width, innerHeight: height } = window;
    renderer.setSize(width, height);
    composer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    csm.updateFrustums();
    this.dispatchEvent(Viewport.ResizeEvent);
  }
}

export default Viewport;
