/**
 * NovaStar Animation System
 * Tweening, keyframe animation, procedural animation helpers
 */

import * as THREE from 'three';

// ─── EASING FUNCTIONS ────────────────────────────
export const Easing = {
  linear: t => t,
  easeInQuad: t => t * t,
  easeOutQuad: t => t * (2 - t),
  easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeInCubic: t => t * t * t,
  easeOutCubic: t => (--t) * t * t + 1,
  easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeInElastic: t => t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3)),
  easeOutElastic: t => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
  easeInOutElastic: t => {
    if (t === 0 || t === 1) return t;
    return t < 0.5
      ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * ((2 * Math.PI) / 4.5))) / 2
      : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * ((2 * Math.PI) / 4.5))) / 2 + 1;
  },
  easeOutBounce: t => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  },
  easeInBounce: t => 1 - Easing.easeOutBounce(1 - t),
  easeInBack: t => 2.70158 * t * t * t - 1.70158 * t * t,
  easeOutBack: t => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
};

// ─── TWEEN ───────────────────────────────────────
class Tween {
  constructor(target, props, options) {
    this.target = target;
    this.props = props;
    this.duration = options.duration || 1;
    this.easing = options.easing || Easing.easeOutCubic;
    this.delay = options.delay || 0;
    this.onComplete = options.onComplete || null;
    this.onUpdate = options.onUpdate || null;
    this.loop = options.loop || false;
    this.yoyo = options.yoyo || false;

    this.elapsed = 0;
    this.started = false;
    this.finished = false;
    this.startValues = {};
    this.endValues = {};
    this._forward = true;
  }

  _captureStart() {
    for (const key in this.props) {
      if (typeof this.target[key] === 'object' && this.target[key] !== null) {
        // Handle THREE.Vector3, Color, etc.
        this.startValues[key] = {};
        this.endValues[key] = {};
        for (const subKey in this.props[key]) {
          this.startValues[key][subKey] = this.target[key][subKey];
          this.endValues[key][subKey] = this.props[key][subKey];
        }
      } else {
        this.startValues[key] = this.target[key];
        this.endValues[key] = this.props[key];
      }
    }
  }

  update(dt) {
    if (this.finished) return false;

    this.elapsed += dt;
    if (this.elapsed < this.delay) return true;

    if (!this.started) {
      this._captureStart();
      this.started = true;
    }

    const timeInTween = this.elapsed - this.delay;
    let t = Math.min(timeInTween / this.duration, 1);
    if (!this._forward) t = 1 - t;
    const easedT = this.easing(t);

    // Apply interpolation
    for (const key in this.props) {
      if (typeof this.target[key] === 'object' && this.target[key] !== null) {
        for (const subKey in this.props[key]) {
          this.target[key][subKey] = this.startValues[key][subKey] +
            (this.endValues[key][subKey] - this.startValues[key][subKey]) * easedT;
        }
      } else {
        this.target[key] = this.startValues[key] +
          (this.endValues[key] - this.startValues[key]) * easedT;
      }
    }

    if (this.onUpdate) this.onUpdate(easedT);

    if (timeInTween >= this.duration) {
      if (this.yoyo) {
        this._forward = !this._forward;
        this.elapsed = this.delay;
        if (this._forward && !this.loop) {
          this.finished = true;
        }
      } else if (this.loop) {
        this.elapsed = this.delay;
      } else {
        this.finished = true;
      }
      if (this.finished && this.onComplete) this.onComplete();
    }

    return !this.finished;
  }
}


// ─── KEYFRAME ANIMATION ──────────────────────────
class KeyframeAnimation {
  constructor(target, keyframes, options = {}) {
    this.target = target;
    this.keyframes = keyframes; // [ { time: 0, props: {...} }, { time: 1, props: {...} } ]
    this.duration = options.duration || 1;
    this.loop = options.loop ?? true;
    this.easing = options.easing || Easing.linear;
    this.onComplete = options.onComplete || null;

    this.elapsed = 0;
    this.finished = false;

    // Sort keyframes by time
    this.keyframes.sort((a, b) => a.time - b.time);
  }

  update(dt) {
    if (this.finished) return false;

    this.elapsed += dt;
    let t = this.elapsed / this.duration;

    if (t >= 1) {
      if (this.loop) {
        t = t % 1;
        this.elapsed = this.elapsed % this.duration;
      } else {
        t = 1;
        this.finished = true;
      }
    }

    // Find surrounding keyframes
    let prevFrame = this.keyframes[0];
    let nextFrame = this.keyframes[this.keyframes.length - 1];

    for (let i = 0; i < this.keyframes.length - 1; i++) {
      if (t >= this.keyframes[i].time && t <= this.keyframes[i + 1].time) {
        prevFrame = this.keyframes[i];
        nextFrame = this.keyframes[i + 1];
        break;
      }
    }

    // Interpolate between keyframes
    const segmentT = nextFrame.time === prevFrame.time ? 1 :
      (t - prevFrame.time) / (nextFrame.time - prevFrame.time);
    const easedT = this.easing(segmentT);

    for (const key in nextFrame.props) {
      const from = prevFrame.props[key] ?? this.target[key];
      const to = nextFrame.props[key];
      if (typeof from === 'number') {
        this.target[key] = from + (to - from) * easedT;
      }
    }

    if (this.finished && this.onComplete) this.onComplete();
    return !this.finished;
  }
}


// ─── ANIMATION SYSTEM ────────────────────────────
export class AnimationSystem {
  constructor(engine) {
    this.engine = engine;
    this.tweens = [];
    this.animations = [];

    engine.onUpdate((dt) => this.update(dt));
  }

  /**
   * Tween an object's properties over time
   * @returns {Promise} Resolves when tween completes
   */
  tween(target, props, options = {}) {
    const tw = new Tween(target, props, options);
    this.tweens.push(tw);
    return new Promise(resolve => {
      const orig = tw.onComplete;
      tw.onComplete = () => {
        if (orig) orig();
        resolve();
      };
    });
  }

  /**
   * Play a keyframe animation
   */
  keyframe(target, keyframes, options = {}) {
    const anim = new KeyframeAnimation(target, keyframes, options);
    this.animations.push(anim);
    return anim;
  }

  /**
   * Delay for a given number of seconds
   */
  wait(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }

  /**
   * Run multiple animations in sequence
   */
  async sequence(...fns) {
    for (const fn of fns) await fn();
  }

  /**
   * Run multiple animations in parallel
   */
  parallel(...promises) {
    return Promise.all(promises);
  }

  // ─── PROCEDURAL HELPERS ────────────────────────
  /** Smooth bobbing motion */
  bob(object, amplitude = 0.5, speed = 2) {
    const startY = object.position.y;
    return this.keyframe(object.position, [
      { time: 0, props: { y: startY } },
      { time: 0.5, props: { y: startY + amplitude } },
      { time: 1, props: { y: startY } },
    ], { duration: 1 / speed, loop: true, easing: Easing.easeInOutQuad });
  }

  /** Continuous rotation */
  spin(object, speed = 1, axis = 'y') {
    const startAngle = object.rotation[axis];
    return this.keyframe(object.rotation, [
      { time: 0, props: { [axis]: startAngle } },
      { time: 1, props: { [axis]: startAngle + Math.PI * 2 } },
    ], { duration: 1 / speed, loop: true });
  }

  /** Squash & stretch */
  async squash(object, intensity = 0.3, duration = 0.2) {
    const orig = { x: object.scale.x, y: object.scale.y, z: object.scale.z };
    await this.tween(object.scale, {
      x: orig.x * (1 + intensity),
      y: orig.y * (1 - intensity),
      z: orig.z * (1 + intensity),
    }, { duration: duration / 2, easing: Easing.easeOutQuad });
    await this.tween(object.scale, orig, {
      duration: duration / 2, easing: Easing.easeOutElastic,
    });
  }

  /** Shake effect */
  async shake(object, intensity = 0.3, duration = 0.4) {
    const orig = { x: object.position.x, y: object.position.y, z: object.position.z };
    const steps = Math.floor(duration / 0.05);
    for (let i = 0; i < steps; i++) {
      const decay = 1 - i / steps;
      await this.tween(object.position, {
        x: orig.x + (Math.random() - 0.5) * intensity * 2 * decay,
        y: orig.y + (Math.random() - 0.5) * intensity * decay,
        z: orig.z + (Math.random() - 0.5) * intensity * 2 * decay,
      }, { duration: 0.05 });
    }
    await this.tween(object.position, orig, { duration: 0.05 });
  }

  /** Pop in from scale 0 */
  async popIn(object, duration = 0.4) {
    object.scale.set(0, 0, 0);
    object.visible = true;
    await this.tween(object.scale, { x: 1, y: 1, z: 1 }, {
      duration, easing: Easing.easeOutBack,
    });
  }

  /** Pop out to scale 0 then hide */
  async popOut(object, duration = 0.3) {
    await this.tween(object.scale, { x: 0, y: 0, z: 0 }, {
      duration, easing: Easing.easeInBack,
    });
    object.visible = false;
  }

  update(dt) {
    // Update tweens
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      if (!this.tweens[i].update(dt)) {
        this.tweens.splice(i, 1);
      }
    }
    // Update keyframe animations
    for (let i = this.animations.length - 1; i >= 0; i--) {
      if (!this.animations[i].update(dt)) {
        this.animations.splice(i, 1);
      }
    }
  }

  /** Kill all active tweens/animations on a target */
  killAll(target) {
    this.tweens = this.tweens.filter(t => t.target !== target);
    this.animations = this.animations.filter(a => a.target !== target);
  }

  clear() {
    this.tweens.length = 0;
    this.animations.length = 0;
  }
}
