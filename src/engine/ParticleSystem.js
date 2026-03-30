/**
 * NovaStar Particle System
 * GPU-friendly particle emitters for juice and game feel
 */

import * as THREE from 'three';

class Emitter {
  constructor(scene, options) {
    this.scene = scene;
    this.age = 0;
    this.maxLife = options.lifetime || 1.0;
    this.gravity = options.gravity ?? -8;
    this.sizeDecay = options.sizeDecay ?? true;
    this.startSize = options.size || 0.15;
    this.alive = true;

    const count = options.count || 15;
    const speed = options.speed || 4;
    const spread = options.spread || 1;
    const color = options.color || 0xffffff;
    const shape = options.shape || 'sphere';

    // Build geometry
    const positions = new Float32Array(count * 3);
    this.velocities = [];
    this.lifetimes = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3]     = options.position.x;
      positions[i * 3 + 1] = options.position.y;
      positions[i * 3 + 2] = options.position.z;

      let vx, vy, vz;
      if (shape === 'sphere') {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const s = speed * (0.4 + Math.random() * 0.6);
        vx = s * Math.sin(phi) * Math.cos(theta) * spread;
        vy = s * Math.sin(phi) * Math.sin(theta) * 0.5 + speed * 0.5;
        vz = s * Math.cos(phi) * spread;
      } else if (shape === 'ring') {
        const a = Math.random() * Math.PI * 2;
        vx = Math.cos(a) * speed * spread;
        vy = speed * 0.2 + Math.random() * speed * 0.3;
        vz = Math.sin(a) * speed * spread;
      } else if (shape === 'fountain') {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * spread * 0.3;
        vx = Math.cos(a) * r * speed;
        vy = speed * (0.7 + Math.random() * 0.3);
        vz = Math.sin(a) * r * speed;
      } else if (shape === 'trail') {
        vx = (Math.random() - 0.5) * speed * 0.2;
        vy = Math.random() * speed * 0.5;
        vz = (Math.random() - 0.5) * speed * 0.2;
      } else {
        vx = (Math.random() - 0.5) * speed * spread;
        vy = Math.random() * speed;
        vz = (Math.random() - 0.5) * speed * spread;
      }

      this.velocities.push(new THREE.Vector3(vx, vy, vz));
      this.lifetimes.push(this.maxLife * (0.5 + Math.random() * 0.5));
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color, size: this.startSize, transparent: true, opacity: 1,
      depthWrite: false, blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(geom, mat);
    this.scene.add(this.points);

    this.startColor = new THREE.Color(color);
    this.endColor = options.colorEnd
      ? new THREE.Color(options.colorEnd)
      : this.startColor.clone().multiplyScalar(0.2);
  }

  update(dt) {
    this.age += dt;
    const progress = Math.min(this.age / this.maxLife, 1);
    const positions = this.points.geometry.attributes.position.array;
    const count = this.velocities.length;

    for (let i = 0; i < count; i++) {
      const localProg = Math.min(this.age / this.lifetimes[i], 1);
      if (localProg >= 1) continue;

      this.velocities[i].y += this.gravity * dt;
      positions[i * 3]     += this.velocities[i].x * dt;
      positions[i * 3 + 1] += this.velocities[i].y * dt;
      positions[i * 3 + 2] += this.velocities[i].z * dt;
    }

    this.points.geometry.attributes.position.needsUpdate = true;

    // Fade & shrink
    this.points.material.opacity = 1 - progress;
    if (this.sizeDecay) {
      this.points.material.size = this.startSize * (1 - progress * 0.8);
    }

    // Color lerp
    const c = new THREE.Color();
    c.lerpColors(this.startColor, this.endColor, progress);
    this.points.material.color = c;

    if (this.age >= this.maxLife) {
      this.alive = false;
    }
  }

  dispose() {
    this.scene.remove(this.points);
    this.points.geometry.dispose();
    this.points.material.dispose();
  }
}


export class ParticleSystem {
  constructor(engine) {
    this.engine = engine;
    this.emitters = [];
  }

  /**
   * Emit a burst of particles
   * @param {Object} options
   * @param {THREE.Vector3} options.position - World position
   * @param {number} options.count - Number of particles (default: 15)
   * @param {number|string} options.color - Color hex (default: 0xffffff)
   * @param {number|string} options.colorEnd - End color for lerp
   * @param {number} options.size - Particle size (default: 0.15)
   * @param {number} options.speed - Emission speed (default: 4)
   * @param {number} options.lifetime - Seconds to live (default: 1.0)
   * @param {number} options.gravity - Gravity force (default: -8)
   * @param {number} options.spread - Direction spread (default: 1)
   * @param {string} options.shape - 'sphere'|'ring'|'fountain'|'trail'|'random'
   * @param {boolean} options.sizeDecay - Shrink over time (default: true)
   */
  emit(options) {
    const emitter = new Emitter(this.engine.scene, options);
    this.emitters.push(emitter);
    return emitter;
  }

  // ─── PRESET EFFECTS ────────────────────────────
  /** Colorful star collect burst */
  collectEffect(position) {
    this.emit({
      position, count: 20, color: 0xffee44, colorEnd: 0xff8800,
      size: 0.2, speed: 5, lifetime: 0.6, gravity: -2,
      shape: 'sphere', spread: 0.8
    });
    this.emit({
      position, count: 8, color: 0xffffff,
      size: 0.08, speed: 2, lifetime: 0.8, gravity: 0,
      shape: 'ring', spread: 1.5
    });
  }

  /** Dust puff when landing */
  landEffect(position) {
    this.emit({
      position, count: 12, color: 0xccbb99, colorEnd: 0x998866,
      size: 0.25, speed: 2, lifetime: 0.4, gravity: -1,
      shape: 'ring', spread: 1.2
    });
  }

  /** Dash trail */
  dashEffect(position) {
    this.emit({
      position, count: 8, color: 0x88ddff, colorEnd: 0x4488cc,
      size: 0.12, speed: 1, lifetime: 0.3, gravity: 0,
      shape: 'trail', spread: 0.5
    });
  }

  /** Jump burst at feet */
  jumpEffect(position) {
    this.emit({
      position, count: 8, color: 0xffffff,
      size: 0.1, speed: 2.5, lifetime: 0.3, gravity: -4,
      shape: 'ring', spread: 0.6
    });
  }

  /** Explosion effect */
  explosionEffect(position, color = 0xff6633) {
    this.emit({
      position, count: 30, color, colorEnd: 0x331100,
      size: 0.3, speed: 8, lifetime: 0.8, gravity: -3,
      shape: 'sphere', spread: 1
    });
    this.emit({
      position, count: 15, color: 0xffcc00,
      size: 0.15, speed: 4, lifetime: 0.5, gravity: 0,
      shape: 'sphere', spread: 0.5
    });
  }

  /** Ambient sparkle */
  sparkle(position) {
    this.emit({
      position, count: 3, color: 0xffffff,
      size: 0.06, speed: 0.5, lifetime: 0.8, gravity: 1,
      shape: 'random', spread: 0.3
    });
  }

  update(dt) {
    for (let i = this.emitters.length - 1; i >= 0; i--) {
      const e = this.emitters[i];
      e.update(dt);
      if (!e.alive) {
        e.dispose();
        this.emitters.splice(i, 1);
      }
    }
  }

  clear() {
    for (const e of this.emitters) e.dispose();
    this.emitters.length = 0;
  }
}
