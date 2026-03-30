/**
 * NovaStar Camera System
 * Multiple camera modes: follow, orbit, fixed, cinematic, first-person
 */

import * as THREE from 'three';

export class CameraSystem {
  constructor(engine) {
    this.engine = engine;
    this.camera = engine.camera;
    this._mode = 'free';
    this._target = null;

    // Follow camera settings
    this.followOffset = new THREE.Vector3(0, 8, 12);
    this.followSmoothness = 6;
    this.followLookOffset = new THREE.Vector3(0, 1, 0);

    // Orbit settings
    this.orbitDistance = 15;
    this.orbitAngleX = 0;
    this.orbitAngleY = 0.6;
    this.orbitSpeed = 0.5;

    // Shake
    this._shakeIntensity = 0;
    this._shakeDuration = 0;
    this._shakeElapsed = 0;
    this._shakeOffset = new THREE.Vector3();

    // Cinematic
    this._cinematicPath = [];
    this._cinematicTime = 0;
    this._cinematicDuration = 0;
    this._cinematicCallback = null;

    // Bounds
    this.bounds = null; // { min: Vector3, max: Vector3 }

    this._smoothPos = this.camera.position.clone();

    engine.onLateUpdate((dt) => this._update(dt));
  }

  // ─── MODE SETTERS ──────────────────────────────
  /** Follow a target with smooth lerp */
  follow(target, offset, smoothness) {
    this._mode = 'follow';
    this._target = target;
    if (offset) this.followOffset.copy(offset);
    if (smoothness) this.followSmoothness = smoothness;
  }

  /** Orbit around a target or point */
  orbit(target, distance, angleY) {
    this._mode = 'orbit';
    this._target = target;
    if (distance) this.orbitDistance = distance;
    if (angleY) this.orbitAngleY = angleY;
  }

  /** Fixed camera position looking at target */
  fixed(position, lookAt) {
    this._mode = 'fixed';
    this.camera.position.copy(position);
    this._target = lookAt || new THREE.Vector3();
  }

  /** First-person attached to target */
  firstPerson(target, heightOffset = 1.6) {
    this._mode = 'firstperson';
    this._target = target;
    this._fpHeight = heightOffset;
  }

  /** Side-scroller camera (2.5D) */
  sideScroll(target, offset) {
    this._mode = 'sidescroll';
    this._target = target;
    this.followOffset = offset || new THREE.Vector3(0, 3, 15);
  }

  /** Top-down camera */
  topDown(target, height = 20) {
    this._mode = 'topdown';
    this._target = target;
    this._topDownHeight = height;
  }

  /** Free camera (no automatic movement) */
  free() {
    this._mode = 'free';
    this._target = null;
  }

  // ─── CAMERA SHAKE ──────────────────────────────
  shake(intensity = 0.5, duration = 0.3) {
    this._shakeIntensity = intensity;
    this._shakeDuration = duration;
    this._shakeElapsed = 0;
  }

  // ─── CINEMATIC PATH ────────────────────────────
  /** Move camera along a path of points over time */
  cinematic(points, duration, onComplete) {
    this._mode = 'cinematic';
    this._cinematicPath = points; // [ { position: Vector3, lookAt: Vector3 } ]
    this._cinematicDuration = duration;
    this._cinematicTime = 0;
    this._cinematicCallback = onComplete;
  }

  /** Smooth cut to a new position */
  async cutTo(position, lookAt, duration = 1) {
    return new Promise(resolve => {
      this.cinematic([
        { position: this.camera.position.clone(), lookAt: this._target?.position?.clone() || new THREE.Vector3() },
        { position: position.clone(), lookAt: lookAt.clone() },
      ], duration, () => {
        this._mode = 'fixed';
        resolve();
      });
    });
  }

  // ─── BOUNDS ────────────────────────────────────
  setBounds(min, max) {
    this.bounds = { min: min.clone(), max: max.clone() };
  }

  clearBounds() {
    this.bounds = null;
  }

  // ─── UPDATE ────────────────────────────────────
  _update(dt) {
    const targetPos = this._target?.position || this._target || new THREE.Vector3();

    switch (this._mode) {
      case 'follow':
        this._updateFollow(dt, targetPos);
        break;
      case 'orbit':
        this._updateOrbit(dt, targetPos);
        break;
      case 'fixed':
        this.camera.lookAt(targetPos);
        break;
      case 'firstperson':
        this._updateFirstPerson(dt, targetPos);
        break;
      case 'sidescroll':
        this._updateSideScroll(dt, targetPos);
        break;
      case 'topdown':
        this._updateTopDown(dt, targetPos);
        break;
      case 'cinematic':
        this._updateCinematic(dt);
        break;
    }

    // Apply shake
    this._updateShake(dt);

    // Apply bounds
    if (this.bounds) {
      this.camera.position.clamp(this.bounds.min, this.bounds.max);
    }
  }

  _updateFollow(dt, targetPos) {
    const desired = targetPos.clone().add(this.followOffset);
    this._smoothPos.lerp(desired, this.followSmoothness * dt);
    this.camera.position.copy(this._smoothPos);
    this.camera.lookAt(targetPos.clone().add(this.followLookOffset));
  }

  _updateOrbit(dt, targetPos) {
    this.orbitAngleX += this.orbitSpeed * dt;
    const x = targetPos.x + this.orbitDistance * Math.sin(this.orbitAngleY) * Math.sin(this.orbitAngleX);
    const y = targetPos.y + this.orbitDistance * Math.cos(this.orbitAngleY);
    const z = targetPos.z + this.orbitDistance * Math.sin(this.orbitAngleY) * Math.cos(this.orbitAngleX);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(targetPos);
  }

  _updateFirstPerson(dt, targetPos) {
    this.camera.position.set(targetPos.x, targetPos.y + this._fpHeight, targetPos.z);
    // Rotation should be controlled by input, not here
  }

  _updateSideScroll(dt, targetPos) {
    const desired = new THREE.Vector3(
      targetPos.x + this.followOffset.x,
      targetPos.y + this.followOffset.y,
      this.followOffset.z
    );
    this._smoothPos.lerp(desired, this.followSmoothness * dt);
    this.camera.position.copy(this._smoothPos);
    this.camera.lookAt(this._smoothPos.x, this._smoothPos.y - this.followOffset.y + 1, 0);
  }

  _updateTopDown(dt, targetPos) {
    const desired = new THREE.Vector3(targetPos.x, this._topDownHeight, targetPos.z);
    this._smoothPos.lerp(desired, this.followSmoothness * dt);
    this.camera.position.copy(this._smoothPos);
    this.camera.lookAt(this._smoothPos.x, 0, this._smoothPos.z);
  }

  _updateCinematic(dt) {
    this._cinematicTime += dt;
    const t = Math.min(this._cinematicTime / this._cinematicDuration, 1);

    if (this._cinematicPath.length >= 2) {
      // Catmull-Rom-like interpolation between path points
      const segmentCount = this._cinematicPath.length - 1;
      const segment = Math.min(Math.floor(t * segmentCount), segmentCount - 1);
      const segT = (t * segmentCount) - segment;
      const eased = segT * segT * (3 - 2 * segT); // smoothstep

      const from = this._cinematicPath[segment];
      const to = this._cinematicPath[segment + 1];

      this.camera.position.lerpVectors(from.position, to.position, eased);
      if (from.lookAt && to.lookAt) {
        const look = new THREE.Vector3().lerpVectors(from.lookAt, to.lookAt, eased);
        this.camera.lookAt(look);
      }
    }

    if (t >= 1) {
      if (this._cinematicCallback) this._cinematicCallback();
      this._mode = 'free';
    }
  }

  _updateShake(dt) {
    if (this._shakeDuration <= 0) return;

    this._shakeElapsed += dt;
    if (this._shakeElapsed >= this._shakeDuration) {
      this._shakeDuration = 0;
      return;
    }

    const decay = 1 - (this._shakeElapsed / this._shakeDuration);
    const i = this._shakeIntensity * decay;

    this._shakeOffset.set(
      (Math.random() - 0.5) * i * 2,
      (Math.random() - 0.5) * i,
      (Math.random() - 0.5) * i * 2
    );
    this.camera.position.add(this._shakeOffset);
  }
}
