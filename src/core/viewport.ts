import {
  Clock,
  EventDispatcher,
  Material,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Shader,
  Vector3,
  WebGLRenderer,
} from 'three';
import { CSM } from 'three/examples/jsm/csm/CSM.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
// @ts-ignore
import { N8AOPass } from 'n8ao';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import Controls, { Buttons } from './controls';
import Physics from './physics';
import SFX from './sfx';
import { loadEnvironment } from '../textures';
import Environment from '../textures/industrial_sunset_puresky_1k.exr';

class Viewport extends EventDispatcher {
  private animate?: (buttons: Buttons, delta: number, time: number) => void;
  private readonly antialias: SMAAPass;
  private readonly clock: Clock;
  private readonly composer: EffectComposer;
  private readonly csm: CSM;
  public readonly camera: PerspectiveCamera;
  public readonly controls: Controls;
  public readonly physics: Physics;
  public readonly raycaster: Raycaster;
  public readonly renderer: WebGLRenderer;
  private renderRadius: number;
  private resolution: number;
  public readonly scene: Scene;
  public readonly sfx: SFX;
  private readonly time: { value: number; };

  constructor() {
    super();
    const dom = document.getElementById('viewport');
    if (!dom) {
      throw new Error('Couldn\'t get viewport');
    }
    const antialias = localStorage.getItem('viewport:antialias') !== '0';
    const fov = parseInt(localStorage.getItem('viewport:fov') || '75', 10);
    this.renderRadius = parseInt(localStorage.getItem('viewport:renderRadius') || '8', 10);
    this.resolution = parseFloat(localStorage.getItem('viewport:resolution') || '1');
    this.camera = new PerspectiveCamera(
      fov,
      window.innerWidth / window.innerHeight,
      0.1,
      this.renderRadius * 16
    );
    this.clock = new Clock();
    this.physics = new Physics();
    this.raycaster = new Raycaster();
    this.raycaster.far = this.camera.far;
    this.controls = new Controls(this.camera, this.physics, dom);
    this.renderer = new WebGLRenderer({
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.scene = new Scene();
    loadEnvironment(Environment, this.renderer).then(({ background, environment }) => {
      this.scene.background = background;
      this.scene.environment = environment;
    });
    this.sfx = new SFX();
    this.scene.add(this.sfx);
    this.time = { value: this.clock.oldTime / 1000 };
    this.csm = new CSM({
      camera: this.camera,
      cascades: 4,
      lightDirection: (new Vector3(-0.5, -1, -0.5)).normalize(),
      maxFar: this.camera.far,
      mode: 'practical' as any,
      parent: this.scene,
      shadowMapSize: 1024,
    });
    this.csm.fade = true;
    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio((window.devicePixelRatio || 1) * this.resolution);
    this.composer.addPass(new N8AOPass(
      this.scene,
      this.camera,
      window.innerWidth,
      window.innerHeight
    ));
    this.antialias = new SMAAPass(window.innerWidth, window.innerHeight);
    this.antialias.enabled = antialias;
    this.composer.addPass(this.antialias);

    this.resize();
    window.addEventListener('resize', this.resize.bind(this));
    dom.appendChild(this.renderer.domElement);

    document.addEventListener('visibilitychange', () => (
      document.visibilityState === 'visible' && this.clock.start()
    ));
    this.renderer.setAnimationLoop(this.render.bind(this));
  }
  
  setAnimationLoop(animate: (buttons: Buttons, delta: number, time: number) => void) {
    this.animate = animate;
    this.clock.start();
  }

  getAntialias() {
    const { antialias } = this;
    return antialias.enabled;
  }

  setAntialias(enabled: boolean) {
    const { antialias } = this;
    antialias.enabled = enabled;
    localStorage.setItem('viewport:antialias', enabled ? '1' : '0');
  }

  getFOV() {
    const { camera: { fov } } = this;
    return fov;
  }

  setFOV(fov: number) {
    const { camera, csm } = this;
    camera.fov = fov;
    camera.updateProjectionMatrix();
    csm.updateFrustums();
    localStorage.setItem('viewport:fov', `${fov}`);
  }

  getRenderRadius() {
    const { renderRadius } = this;
    return renderRadius;
  }

  setRenderRadius(radius: number) {
    const { camera, csm, raycaster } = this;
    this.renderRadius = radius;
    camera.far = csm.maxFar = raycaster.far = radius * 16;
    camera.updateProjectionMatrix();
    csm.updateFrustums();
    localStorage.setItem('viewport:renderRadius', `${radius}`);
  }

  getResolution() {
    const { resolution } = this;
    return resolution;
  }

  setResolution(scale: number) {
    const { composer } = this;
    this.resolution = scale;
    const ratio = (window.devicePixelRatio || 1) * scale;
    composer.setPixelRatio(ratio);
    localStorage.setItem('viewport:resolution', `${scale}`);
  }

  setupMaterialCSM(material: Material) {
    const { csm } = this;
    const obc = material.onBeforeCompile.bind(material);
    csm.setupMaterial(material);
    const csmobc = material.onBeforeCompile.bind(material);
    material.onBeforeCompile = (shader: Shader, renderer: WebGLRenderer) => {
      csmobc(shader, renderer);
      obc(shader, renderer);
    };
  }

  setupMaterialTime(material: Material) {
    const { time } = this;
    const obc = material.onBeforeCompile.bind(material);
    material.onBeforeCompile = (shader: Shader, renderer: WebGLRenderer) => {
      shader.uniforms.time = time;
      obc(shader, renderer);
    };
    material.userData.time = time;
  }

  private render() {
    const { camera, clock, composer, controls, csm, physics, sfx, time } = this;
    if (!this.animate) {
      return;
    }
    const delta = Math.min(clock.getDelta(), 0.2);
    time.value = clock.oldTime / 1000;
    controls.update(delta);
    physics.step(delta);
    this.animate(controls.buttons, delta, time.value);
    controls.clearButtons();
    sfx.updateListener(camera);
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
  }
}

export default Viewport;
