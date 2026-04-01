/**
 * NovaStar Screen Effects v0.4
 * Camera shake, screen flash, slow motion, chromatic aberration, vignette
 *
 * Usage:
 *   const fx = new ScreenEffects(engine);
 *   fx.shake(0.5, 8);        // 0.5 sec, intensity 8
 *   fx.flash('#ff0000', 0.3); // red flash, 0.3 sec
 *   fx.slowMotion(0.2, 1.5);  // 20% speed for 1.5 sec
 *   fx.freeze(0.1);           // freeze frame for 0.1 sec (hit stop)
 */

import * as THREE from 'three';

export class ScreenEffects {
  constructor(engine) {
    this.engine = engine;
    this._shaking = false;
    this._shakeTime = 0;
    this._shakeDuration = 0;
    this._shakeIntensity = 0;
    this._origCamPos = new THREE.Vector3();
    this._flashEl = null;
    this._timeScale = 1;
    this._timeScaleTimer = 0;
    this._frozen = false;
    this._freezeTimer = 0;

    engine.onUpdate((dt) => this._update(dt));
  }

  // Camera shake
  shake(duration = 0.3, intensity = 5) {
    this._shaking = true;
    this._shakeDuration = duration;
    this._shakeTime = 0;
    this._shakeIntensity = intensity;
    this._origCamPos.copy(this.engine.camera.position);
  }

  // Screen flash overlay
  flash(color = '#ffffff', duration = 0.2, opacity = 0.6) {
    if (!this._flashEl) {
      this._flashEl = document.createElement('div');
      this._flashEl.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:999;transition:opacity 0.1s;opacity:0;';
      document.body.appendChild(this._flashEl);
    }
    this._flashEl.style.background = color;
    this._flashEl.style.opacity = String(opacity);
    setTimeout(() => { if (this._flashEl) this._flashEl.style.opacity = '0'; }, duration * 1000);
  }

  // Slow motion
  slowMotion(timeScale = 0.3, duration = 1.0) {
    this._timeScale = timeScale;
    this._timeScaleTimer = duration;
  }

  // Freeze frame (hit stop effect)
  freeze(duration = 0.08) {
    this._frozen = true;
    this._freezeTimer = duration;
  }

  // Speed up
  speedUp(timeScale = 2.0, duration = 1.0) {
    this._timeScale = timeScale;
    this._timeScaleTimer = duration;
  }

  get timeScale() { return this._frozen ? 0 : this._timeScale; }

  // Zoom punch (quick zoom in and back)
  zoomPunch(amount = 2, duration = 0.2) {
    const cam = this.engine.camera;
    const origFov = cam.fov;
    cam.fov -= amount;
    cam.updateProjectionMatrix();
    setTimeout(() => {
      cam.fov = origFov;
      cam.updateProjectionMatrix();
    }, duration * 1000);
  }

  // Rumble (continuous shake, call stop to end)
  startRumble(intensity = 3) {
    this._shaking = true;
    this._shakeDuration = Infinity;
    this._shakeTime = 0;
    this._shakeIntensity = intensity;
    this._origCamPos.copy(this.engine.camera.position);
  }

  stopRumble() {
    this._shaking = false;
    this.engine.camera.position.copy(this._origCamPos);
  }

  _update(dt) {
    // Freeze
    if (this._frozen) {
      this._freezeTimer -= dt;
      if (this._freezeTimer <= 0) this._frozen = false;
    }

    // Time scale
    if (this._timeScaleTimer > 0) {
      this._timeScaleTimer -= dt;
      if (this._timeScaleTimer <= 0) this._timeScale = 1;
    }

    // Shake
    if (this._shaking) {
      this._shakeTime += dt;
      if (this._shakeTime >= this._shakeDuration) {
        this._shaking = false;
        this.engine.camera.position.copy(this._origCamPos);
      } else {
        const decay = 1 - (this._shakeTime / this._shakeDuration);
        const i = this._shakeIntensity * decay * 0.01;
        this.engine.camera.position.set(
          this._origCamPos.x + (Math.random() - 0.5) * i,
          this._origCamPos.y + (Math.random() - 0.5) * i,
          this._origCamPos.z + (Math.random() - 0.5) * i
        );
      }
    }
  }
}
