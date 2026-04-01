/**
 * NovaStar First Person Controller v0.4.2
 * Full first-person camera with:
 * - Mouse look (pointer lock)
 * - WASD movement with sprint
 * - Head bobbing
 * - Smooth camera rotation
 * - Configurable sensitivity, speed, FOV
 * 
 * Usage:
 *   const fps = new FirstPersonController(engine, { height: 1.6, speed: 5 });
 *   fps.enable();
 *   // In update loop, call fps.update(dt)
 */

import * as THREE from 'three';

export class FirstPersonController {
  constructor(engine, options = {}) {
    this.engine = engine;
    this.camera = engine.camera;

    // Config
    this.height = options.height ?? 1.6;
    this.speed = options.speed ?? 5;
    this.sprintMultiplier = options.sprintMultiplier ?? 1.8;
    this.jumpForce = options.jumpForce ?? 8;
    this.gravity = options.gravity ?? -25;
    this.sensitivity = options.sensitivity ?? 0.002;
    this.maxPitch = options.maxPitch ?? Math.PI / 2 - 0.05;
    this.bobAmount = options.bobAmount ?? 0.04;
    this.bobSpeed = options.bobSpeed ?? 10;

    // State
    this.position = new THREE.Vector3(
      options.x ?? 0,
      options.y ?? this.height,
      options.z ?? 0
    );
    this.velocity = new THREE.Vector3();
    this.yaw = 0;    // horizontal rotation
    this.pitch = 0;  // vertical rotation
    this.grounded = false;
    this.enabled = false;
    this.locked = false;
    this._bobPhase = 0;
    this._moveDir = new THREE.Vector3();

    // Input state
    this._keys = {};
    this._mouseDX = 0;
    this._mouseDY = 0;

    // Bind handlers
    this._onKeyDown = (e) => { this._keys[e.code] = true; };
    this._onKeyUp = (e) => { this._keys[e.code] = false; };
    this._onMouseMove = (e) => {
      if (!this.locked) return;
      this._mouseDX += e.movementX;
      this._mouseDY += e.movementY;
    };
    this._onPointerLockChange = () => {
      this.locked = document.pointerLockElement === this.engine.renderer.three.domElement;
    };
    this._onClick = () => {
      if (this.enabled && !this.locked) {
        this.engine.renderer.three.domElement.requestPointerLock();
      }
    };
  }

  enable() {
    if (this.enabled) return;
    this.enabled = true;

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('pointerlockchange', this._onPointerLockChange);
    this.engine.renderer.three.domElement.addEventListener('click', this._onClick);

    // Set camera to FPS mode
    this.camera.position.copy(this.position);
    this.camera.rotation.order = 'YXZ';
  }

  disable() {
    this.enabled = false;
    this.locked = false;

    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);
    this.engine.renderer.three.domElement.removeEventListener('click', this._onClick);

    if (document.pointerLockElement) document.exitPointerLock();
    this._keys = {};
  }

  /**
   * Call every frame
   */
  update(dt) {
    if (!this.enabled) return;

    // ─── Mouse Look ────────────────────────────
    this.yaw -= this._mouseDX * this.sensitivity;
    this.pitch -= this._mouseDY * this.sensitivity;
    this.pitch = Math.max(-this.maxPitch, Math.min(this.maxPitch, this.pitch));
    this._mouseDX = 0;
    this._mouseDY = 0;

    // ─── Movement ──────────────────────────────
    this._moveDir.set(0, 0, 0);
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    if (this._keys['KeyW'] || this._keys['ArrowUp']) this._moveDir.add(forward);
    if (this._keys['KeyS'] || this._keys['ArrowDown']) this._moveDir.sub(forward);
    if (this._keys['KeyD'] || this._keys['ArrowRight']) this._moveDir.add(right);
    if (this._keys['KeyA'] || this._keys['ArrowLeft']) this._moveDir.sub(right);

    if (this._moveDir.lengthSq() > 0) this._moveDir.normalize();

    const isSprinting = this._keys['ShiftLeft'] || this._keys['ShiftRight'];
    const currentSpeed = this.speed * (isSprinting ? this.sprintMultiplier : 1);

    this.position.x += this._moveDir.x * currentSpeed * dt;
    this.position.z += this._moveDir.z * currentSpeed * dt;

    // ─── Jump + Gravity ────────────────────────
    if ((this._keys['Space']) && this.grounded) {
      this.velocity.y = this.jumpForce;
      this.grounded = false;
    }

    this.velocity.y += this.gravity * dt;
    this.position.y += this.velocity.y * dt;

    // Ground check (simple floor)
    if (this.position.y <= this.height) {
      this.position.y = this.height;
      this.velocity.y = 0;
      this.grounded = true;
    }

    // ─── Head Bob ──────────────────────────────
    let bobOffset = 0;
    if (this.grounded && this._moveDir.lengthSq() > 0) {
      this._bobPhase += dt * this.bobSpeed * (isSprinting ? 1.4 : 1);
      bobOffset = Math.sin(this._bobPhase) * this.bobAmount;
    } else {
      this._bobPhase = 0;
    }

    // ─── Apply to Camera ───────────────────────
    this.camera.position.set(
      this.position.x,
      this.position.y + bobOffset,
      this.position.z
    );
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  /**
   * Set position directly
   */
  setPosition(x, y, z) {
    this.position.set(x, y ?? this.height, z);
    this.velocity.set(0, 0, 0);
    this.grounded = false;
  }

  /**
   * Look at a point
   */
  lookAt(x, y, z) {
    const dir = new THREE.Vector3(x, y, z).sub(this.position).normalize();
    this.yaw = Math.atan2(-dir.x, -dir.z);
    this.pitch = Math.asin(dir.y);
  }

  /**
   * Check if a key is currently pressed
   */
  isKeyDown(code) {
    return !!this._keys[code];
  }

  /**
   * Get the forward direction vector
   */
  getForward() {
    return new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
  }

  /**
   * Get the right direction vector
   */
  getRight() {
    return new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
  }
}
