import {
  MathUtils,
  Object3D,
  PerspectiveCamera,
  Vector3,
  Vector4,
} from 'three';
import Physics, { Controller } from './physics';

export type Buttons = {
  primary: boolean;
  secondary: boolean;
  tertiary: boolean;
  build: boolean;
  dismantle: boolean;
  interact: boolean;
};

enum ControlsMode {
  physics,
  photo,
}

class Controls {
  public readonly buttons: Buttons;
  private readonly camera: PerspectiveCamera;
  private controller: Controller | undefined;
  private isLocked: boolean;
  private mode: ControlsMode;
  private readonly movement: Vector4;
  private movementSpeed: number;
  private readonly target: HTMLElement;

  constructor(camera: PerspectiveCamera, physics: Physics, target: HTMLElement) {
    camera.position.set(0, 10, 0);
    camera.rotation.order = 'YXZ';
    camera.userData.movementScale = 1;
    camera.userData.targetPosition = camera.position.clone();
    camera.userData.targetRotation = camera.rotation.clone();
    camera.userData.verticalVelocity = 0;
    this.buttons = {
      primary: false,
      secondary: false,
      tertiary: false,
      build: false,
      dismantle: false,
      interact: false,
    };
    this.camera = camera;
    this.isLocked = false;
    this.mode = ControlsMode.physics;
    this.movement = new Vector4(0, 0, 0, 1);
    this.movementSpeed = 8;
    this.target = target;
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    target.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    target.addEventListener('pointerdown', this.onPointerDown.bind(this));
    document.addEventListener('pointerlockchange', this.onLock.bind(this));
    document.addEventListener('pointermove', this.onPointerMove.bind(this));
    document.addEventListener('pointerup', this.onPointerUp.bind(this));
    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));
    document.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    physics.getController(camera.userData.targetPosition).then((controller) => {
      this.controller = controller;
    });
  }

  clearButtons() {
    const { buttons } = this;
    buttons.primary = false;
    buttons.secondary = false;
    buttons.tertiary = false;
    buttons.build = false;
    buttons.dismantle = false;
    buttons.interact = false;
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
    const { movement } = this;
    this.isLocked = !!document.pointerLockElement;
    document.body.classList[this.isLocked ? 'add' : 'remove']('pointerlock');
    if (!this.isLocked) {
      this.clearButtons();
      movement.set(0, 0, 0, 1);
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
    const { buttons, isLocked, mode, movement } = this;
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
        switch (mode) {
          case ControlsMode.physics:
            movement.w = 2;
            break;
          case ControlsMode.photo:
            movement.y = -1;
            break;
        }
        break;
      case 'KeyQ':
        buttons.build = true;
        break;
      case 'KeyF':
        buttons.dismantle = true;
        break;
      case 'KeyE':
        buttons.interact = true;
        break;
    }
  }

  onKeyUp(e: KeyboardEvent) {
    const { buttons, isLocked, mode, movement } = this;
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
        switch (mode) {
          case ControlsMode.physics:
            if (movement.w > 1) movement.w = 1;
            break;
          case ControlsMode.photo:
            if (movement.y < 0) movement.y = 0;
            break;
        }
        break;
      case 'KeyQ':
        buttons.build = false;
        break;
      case 'KeyF':
        buttons.dismantle = false;
        break;
      case 'KeyE':
        buttons.interact = false;
        break;
    }
  }

  private static readonly speedMin = Math.log(2);
  private static readonly speedMax = Math.log(64);
  private static readonly speedRange = Controls.speedMax - Controls.speedMin;
  onWheel(e: WheelEvent) {
    const { isLocked, mode, movementSpeed } = this;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
    }
    if (!isLocked || mode !== ControlsMode.photo) {
      return;
    }
    const { speedMin, speedRange } = Controls;
    const logSpeed = Math.min(
      Math.max(
        ((Math.log(movementSpeed) - speedMin) / speedRange) - (e.deltaY * 0.0003),
        0
      ),
      1
    );
    this.movementSpeed = Math.exp(speedMin + logSpeed * speedRange);
  }

  setMode(mode: ControlsMode) {
    const { camera, controller, movement } = this;
    this.mode = mode;
    if (controller && mode === ControlsMode.physics) {
      camera.position.copy(controller.body.translation() as Vector3);
      camera.position.y += controller.offset;
      camera.userData.targetPosition.copy(camera.position);
    }
    this.clearButtons();
    movement.set(0, 0, 0, 1);
  }

  private static readonly forward: Vector3 = new Vector3();
  private static readonly right: Vector3 = new Vector3();
  private static readonly step: Vector3 = new Vector3();
  update(delta: number) {
    const { camera, controller, mode, movement, movementSpeed } = this;

    switch (mode) {
      case ControlsMode.physics: {
        if (!controller) {
          return;
        }
        const isGround = camera.userData.verticalVelocity === 0;
        camera.userData.movementScale = MathUtils.damp(camera.userData.movementScale, (isGround && movement.w) || 1, 3, delta);
        Controls.step.set(0, 0, 0);
        if (movement.x !== 0 || movement.z !== 0) {
          camera.getWorldDirection(Controls.forward);
          Controls.forward.y = 0;
          Controls.right.crossVectors(Controls.forward, Object3D.DEFAULT_UP).normalize();
          Controls.step
            .addScaledVector(Controls.right, movement.x)
            .addScaledVector(Controls.forward, movement.z)
            .normalize()
            .multiplyScalar(movementSpeed * camera.userData.movementScale * delta);
        }
        if (isGround && movement.y > 0) {
          camera.userData.verticalVelocity = 30;
          movement.y = 0;
        }
        camera.userData.verticalVelocity = Math.max(camera.userData.verticalVelocity - 90 * delta, -30);
        Controls.step.addScaledVector(Object3D.DEFAULT_UP, camera.userData.verticalVelocity * delta);
        const computed = controller.step(Controls.step);
        camera.userData.targetPosition.add(computed);
        if (Math.abs(Controls.step.y - computed.y) > delta) {
          camera.userData.verticalVelocity = 0;
        }
        // @dani @hack
        // This shouldn't happen, but... better safe than sorry.
        if (camera.userData.targetPosition.y < -32) {
          camera.userData.targetPosition.y = 64;
          controller.body.setTranslation(camera.userData.targetPosition, true);
        }
        break;
      }
      case ControlsMode.photo: {
        // @dani @incomplete
        // This mode is just not to lose this camera controls for recording videos.
        // It could potentially make it's way into the UI (or toggled by a hotkey).
        // But right now is just for debugging purposes and can be only enabled through code.
        if (movement.x !== 0 || movement.y !== 0 || movement.z !== 0) {
          camera.getWorldDirection(Controls.forward);
          Controls.right.crossVectors(Controls.forward, Object3D.DEFAULT_UP).normalize();
          Controls.step
            .set(0, 0, 0)
            .addScaledVector(Controls.right, movement.x)
            .addScaledVector(Object3D.DEFAULT_UP, movement.y)
            .addScaledVector(Controls.forward, movement.z)
            .normalize()
            .multiplyScalar(movementSpeed * delta);
          camera.userData.targetPosition.add(Controls.step);
        }
        break;
      }
    }

    camera.position.x = MathUtils.damp(camera.position.x, camera.userData.targetPosition.x, 10, delta);
    camera.position.y = MathUtils.damp(camera.position.y, camera.userData.targetPosition.y, 10, delta);
    camera.position.z = MathUtils.damp(camera.position.z, camera.userData.targetPosition.z, 10, delta);
    camera.rotation.x = MathUtils.damp(camera.rotation.x, camera.userData.targetRotation.x, 20, delta);
    camera.rotation.y = MathUtils.damp(camera.rotation.y, camera.userData.targetRotation.y, 20, delta);

    camera.updateMatrixWorld();
  }
}

export default Controls;
