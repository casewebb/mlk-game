import * as THREE from 'three';

export interface ControlsConfig {
  moveSpeed: number;
  sprintMultiplier: number;
  jumpForce: number;
  gravity: number;
  playerHeight: number;
  groundY: number;
}

const DEFAULT_CONFIG: ControlsConfig = {
  moveSpeed: 8,
  sprintMultiplier: 1.6,
  jumpForce: 9,
  gravity: 24,
  playerHeight: 1.8,
  groundY: 0,
};

export class FirstPersonControls {
  readonly camera: THREE.PerspectiveCamera;
  readonly config: ControlsConfig;

  private keys = new Set<string>();
  private velocityY = 0;
  private isGrounded = true;
  private yaw = 0;
  private pitch = 0;
  private pointerLocked = false;
  private enabled = false;
  private moveSpeedMultiplier = 1;
  private gravityMultiplier = 1;
  private playerScale = 1;
  private interactPressed = false;
  private throwPressed = false;
  private abilityPressed = false;
  private wakeUpPressed = false;
  private mouseDown = false;

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.code);
    if (e.code === 'KeyE') this.interactPressed = true;
    if (e.code === 'KeyQ') this.abilityPressed = true;
    if (e.code === 'KeyR') this.wakeUpPressed = true;
  };
  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.code);
  private onMouseMove = (e: MouseEvent) => {
    if (!this.pointerLocked) return;
    this.yaw -= e.movementX * 0.002;
    this.pitch -= e.movementY * 0.002;
    this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
  };
  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) this.mouseDown = true;
  };
  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      if (this.mouseDown) this.throwPressed = true;
      this.mouseDown = false;
    }
  };
  private onPointerLockChange = () => {
    this.pointerLocked = document.pointerLockElement === document.body;
  };

  constructor(camera: THREE.PerspectiveCamera, config: Partial<ControlsConfig> = {}) {
    this.camera = camera;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  enable(): void {
    if (this.enabled) return;
    this.enabled = true;
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.body.requestPointerLock();
  }

  disable(): void {
    if (!this.enabled) return;
    this.enabled = false;
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    if (document.pointerLockElement) document.exitPointerLock();
    this.keys.clear();
  }

  setPosition(x: number, y: number, z: number): void {
    this.camera.position.set(x, y, z);
  }

  getPosition(): THREE.Vector3 {
    return this.camera.position.clone();
  }

  getRotationY(): number {
    return this.yaw;
  }

  getForward(): THREE.Vector3 {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
  }

  setMoveSpeedMultiplier(m: number): void {
    this.moveSpeedMultiplier = m;
  }

  setGravityMultiplier(m: number): void {
    this.gravityMultiplier = m;
  }

  setPlayerScale(scale: number): void {
    this.playerScale = scale;
    this.config.playerHeight = 1.8 * scale;
  }

  getPlayerScale(): number {
    return this.playerScale;
  }

  isSprinting(): boolean {
    return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
  }

  consumeInteract(): boolean {
    if (this.interactPressed) {
      this.interactPressed = false;
      return true;
    }
    return false;
  }

  consumeThrow(): boolean {
    if (this.throwPressed) {
      this.throwPressed = false;
      return true;
    }
    return false;
  }

  consumeAbility(): boolean {
    if (this.abilityPressed) {
      this.abilityPressed = false;
      return true;
    }
    return false;
  }

  consumeWakeUp(): boolean {
    if (this.wakeUpPressed) {
      this.wakeUpPressed = false;
      return true;
    }
    return false;
  }

  update(delta: number, bounds?: { min: THREE.Vector3; max: THREE.Vector3 }): void {
    if (!this.enabled) return;

    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const move = new THREE.Vector3();

    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) move.add(forward);
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) move.sub(forward);
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) move.add(right);
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) move.sub(right);

    if (move.lengthSq() > 0) {
      move.normalize();
      const speed = this.isSprinting()
        ? this.config.moveSpeed * this.config.sprintMultiplier
        : this.config.moveSpeed;
      this.camera.position.addScaledVector(move, speed * this.moveSpeedMultiplier * delta);
    }

    if (this.isGrounded && this.keys.has('Space')) {
      this.velocityY = this.config.jumpForce * Math.sqrt(this.gravityMultiplier);
      this.isGrounded = false;
    }

    this.velocityY -= this.config.gravity * this.gravityMultiplier * delta;
    this.camera.position.y += this.velocityY * delta;

    const groundLevel = this.config.groundY + this.config.playerHeight;
    if (this.camera.position.y <= groundLevel) {
      this.camera.position.y = groundLevel;
      this.velocityY = 0;
      this.isGrounded = true;
    }

    if (bounds) {
      this.camera.position.x = THREE.MathUtils.clamp(this.camera.position.x, bounds.min.x, bounds.max.x);
      this.camera.position.z = THREE.MathUtils.clamp(this.camera.position.z, bounds.min.z, bounds.max.z);
    }

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  consumeEscape(): boolean {
    if (this.keys.has('Escape')) {
      this.keys.delete('Escape');
      return true;
    }
    return false;
  }
}
