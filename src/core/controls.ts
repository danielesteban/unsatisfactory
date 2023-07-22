import {
  MathUtils,
  PerspectiveCamera,
  Vector3,
} from 'three';

interface Heightmap {
  getHeight: (position: Vector3) => number;
}

export type Buttons = {
  primary: boolean;
  secondary: boolean;
  tertiary: boolean;
  interact: boolean;
};

class Controls {
  private static readonly height = 1.6;
  private static readonly velocityMin = Math.log(2);
  private static readonly velocityMax = Math.log(64);
  private static readonly velocityRange = Controls.velocityMax - Controls.velocityMin;

  public readonly buttons: Buttons;
  private readonly camera: PerspectiveCamera;
  private heightmap: Heightmap | undefined;
  private isLocked: boolean;
  private readonly movement: Vector3;
  private readonly target: HTMLElement;
  public velocity: number;

  constructor(camera: PerspectiveCamera, target: HTMLElement) {
    camera.position.set(0, Controls.height, 0);
    camera.rotation.order = 'YXZ';
    camera.userData.targetPosition = camera.position.clone();
    camera.userData.targetRotation = camera.rotation.clone();
    this.buttons = {
      primary: false,
      secondary: false,
      tertiary: false,
      interact: false,
    };
    this.camera = camera;
    this.isLocked = false;
    this.movement = new Vector3();
    this.target = target;
    this.velocity = 8;
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    target.addEventListener('touchstart', (e) => e.preventDefault());
    target.addEventListener('pointerdown', this.onPointerDown.bind(this));
    document.addEventListener('pointerlockchange', this.onLock.bind(this));
    document.addEventListener('pointermove', this.onPointerMove.bind(this));
    document.addEventListener('pointerup', this.onPointerUp.bind(this));
    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));
    document.addEventListener('wheel', this.onWheel.bind(this));
  }
      
  lock() {
    const { isLocked, target } = this;
    if (!isLocked) {
      target.requestPointerLock();
    }
  }

  unlock() {
    const { isLocked } = this;
    if (isLocked) {
      document.exitPointerLock();
    }
  }

  onLock() {
    const { buttons, movement } = this;
    this.isLocked = !!document.pointerLockElement;
    document.body.classList[this.isLocked ? 'add' : 'remove']('pointerlock');
    if (!this.isLocked) {
      buttons.primary = false;
      buttons.secondary = false;
      buttons.tertiary = false;
      buttons.interact = false;
      movement.set(0, 0, 0);
    }
  }

  onPointerDown(e: PointerEvent) {
    const { buttons, isLocked } = this;
    if (!e.isPrimary) {
      return;
    }
    if (!isLocked) {
      this.lock();
      return;
    }
    switch (e.button) {
      case 0:
        buttons.primary = true;
        break;
      case 2:
        buttons.secondary = true;
        break;
      case 1:
        buttons.tertiary = true;
        break;
    }
  }

  onPointerMove(e: PointerEvent) {
    const { camera, isLocked } = this;
    if (!e.isPrimary || !isLocked) {
      return;
    }
    const { movementX, movementY } = e;
    camera.userData.targetRotation.y -= movementX * 0.003;
    camera.userData.targetRotation.x -= movementY * 0.003;
    camera.userData.targetRotation.x = Math.min(Math.max(camera.userData.targetRotation.x, Math.PI * -0.5), Math.PI * 0.5);
  }

  onPointerUp(e: PointerEvent) {
    const { buttons, isLocked } = this;
    if (!e.isPrimary || !isLocked) {
      return;
    }
    switch (e.button) {
      case 0:
        buttons.primary = false;
        break;
      case 2:
        buttons.secondary = false;
        break;
      case 1:
        buttons.tertiary = false;
        break;
    }
  }

  onKeyDown(e: KeyboardEvent) {
    const { buttons, isLocked, movement } = this;
    if (!isLocked || e.repeat) {
      return;
    }
    switch (e.code) {
      case 'KeyW':
        movement.z = 1;
        break;
      case 'KeyA':
        movement.x = -1;
        break;
      case 'KeyS':
        movement.z = -1;
        break;
      case 'KeyD':
        movement.x = 1;
        break;
      case 'Space':
        movement.y = 1;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        movement.y = -1;
        break;
      case 'KeyF':
        buttons.interact = true;
        break;
    }
  }

  onKeyUp(e: KeyboardEvent) {
    const { buttons, isLocked, movement } = this;
    if (!isLocked) {
      return;
    }
    switch (e.code) {
      case 'KeyW':
        if (movement.z > 0) movement.z = 0;
        break;
      case 'KeyA':
        if (movement.x < 0) movement.x = 0;
        break;
      case 'KeyS':
        if (movement.z < 0) movement.z = 0;
        break;
      case 'KeyD':
        if (movement.x > 0) movement.x = 0;
        break;
      case 'Space':
        if (movement.y > 0) movement.y = 0;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        if (movement.y < 0) movement.y = 0;
        break;
      case 'KeyF':
        buttons.interact = false;
        break;
    }
  }

  onWheel(e: WheelEvent) {
    const { velocity, isLocked } = this;
    if (!isLocked) {
      return;
    }
    const { velocityMin, velocityRange } = Controls;
    const logSpeed = Math.min(
      Math.max(
        ((Math.log(velocity) - velocityMin) / velocityRange) - (e.deltaY * 0.0003),
        0
      ),
      1
    );
    this.velocity = Math.exp(velocityMin + logSpeed * velocityRange);
  }

  setHeightmap(heightmap: Heightmap) {
    this.heightmap = heightmap;
  }

  private static readonly forward: Vector3 = new Vector3();
  private static readonly right: Vector3 = new Vector3();
  private static readonly worldUp: Vector3 = new Vector3(0, 1, 0);
  private static readonly direction: Vector3 = new Vector3();
  update(delta: number) {
    const { camera, heightmap, movement, velocity } = this;
    camera.rotation.x = MathUtils.damp(camera.rotation.x, camera.userData.targetRotation.x, 20, delta);
    camera.rotation.y = MathUtils.damp(camera.rotation.y, camera.userData.targetRotation.y, 20, delta);

    if (movement.x !== 0 || movement.y !== 0 || movement.z !== 0) {
      camera.getWorldDirection(Controls.forward);
      Controls.right.crossVectors(Controls.forward, Controls.worldUp).normalize();
      Controls.direction
        .set(0, 0, 0)
        .addScaledVector(Controls.right, movement.x)
        .addScaledVector(Controls.worldUp, movement.y)
        .addScaledVector(Controls.forward, movement.z)
        .normalize();
      camera.userData.targetPosition.addScaledVector(Controls.direction, velocity * delta);
      if (heightmap) {
        camera.userData.targetPosition.y = Math.max(camera.userData.targetPosition.y, heightmap.getHeight(camera.userData.targetPosition) + Controls.height);
      }
    }
    camera.position.x = MathUtils.damp(camera.position.x, camera.userData.targetPosition.x, 10, delta);
    camera.position.y = MathUtils.damp(camera.position.y, camera.userData.targetPosition.y, 10, delta);
    camera.position.z = MathUtils.damp(camera.position.z, camera.userData.targetPosition.z, 10, delta);
  }
}

export default Controls;
