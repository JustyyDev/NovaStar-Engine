/**
 * NovaStar Timer System
 * Game timers, delayed calls, countdowns, cooldowns
 */

export class TimerSystem {
  constructor(engine) {
    this.engine = engine;
    this._timers = [];
    this._idCounter = 0;

    engine.onUpdate((dt) => this.update(dt));
  }

  /**
   * Call a function after a delay
   * @returns {number} Timer ID for cancellation
   */
  after(seconds, callback) {
    const id = ++this._idCounter;
    this._timers.push({
      id, elapsed: 0, duration: seconds,
      callback, type: 'once', paused: false
    });
    return id;
  }

  /**
   * Call a function repeatedly at an interval
   * @returns {number} Timer ID for cancellation
   */
  every(seconds, callback, maxCount = Infinity) {
    const id = ++this._idCounter;
    this._timers.push({
      id, elapsed: 0, duration: seconds,
      callback, type: 'repeat', count: 0,
      maxCount, paused: false
    });
    return id;
  }

  /**
   * Countdown timer with progress callback
   * @param {number} seconds - Total countdown time
   * @param {function} onTick - Called each frame with (remaining, progress)
   * @param {function} onComplete - Called when countdown reaches 0
   */
  countdown(seconds, onTick, onComplete) {
    const id = ++this._idCounter;
    this._timers.push({
      id, elapsed: 0, duration: seconds,
      onTick, callback: onComplete,
      type: 'countdown', paused: false
    });
    return id;
  }

  /**
   * Cooldown tracker — returns a function that checks/triggers cooldown
   */
  cooldown(seconds) {
    let lastTrigger = -seconds;
    const engine = this.engine;
    return {
      ready: () => engine.elapsedTime - lastTrigger >= seconds,
      trigger: () => {
        if (engine.elapsedTime - lastTrigger >= seconds) {
          lastTrigger = engine.elapsedTime;
          return true;
        }
        return false;
      },
      remaining: () => Math.max(0, seconds - (engine.elapsedTime - lastTrigger)),
      progress: () => Math.min(1, (engine.elapsedTime - lastTrigger) / seconds),
      reset: () => { lastTrigger = -seconds; }
    };
  }

  /**
   * Promise-based delay
   */
  wait(seconds) {
    return new Promise(resolve => this.after(seconds, resolve));
  }

  /** Pause a timer */
  pause(id) {
    const t = this._timers.find(t => t.id === id);
    if (t) t.paused = true;
  }

  /** Resume a timer */
  resume(id) {
    const t = this._timers.find(t => t.id === id);
    if (t) t.paused = false;
  }

  /** Cancel a timer */
  cancel(id) {
    this._timers = this._timers.filter(t => t.id !== id);
  }

  /** Cancel all timers */
  clear() {
    this._timers.length = 0;
  }

  update(dt) {
    for (let i = this._timers.length - 1; i >= 0; i--) {
      const t = this._timers[i];
      if (t.paused) continue;

      t.elapsed += dt;

      if (t.type === 'countdown' && t.onTick) {
        const remaining = Math.max(0, t.duration - t.elapsed);
        const progress = Math.min(1, t.elapsed / t.duration);
        t.onTick(remaining, progress);
      }

      if (t.elapsed >= t.duration) {
        if (t.callback) t.callback();

        if (t.type === 'repeat') {
          t.count++;
          t.elapsed -= t.duration;
          if (t.count >= t.maxCount) {
            this._timers.splice(i, 1);
          }
        } else {
          this._timers.splice(i, 1);
        }
      }
    }
  }
}
