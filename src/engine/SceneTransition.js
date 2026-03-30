/**
 * NovaStar Scene Transitions
 * Smooth transitions between scenes: fade, wipe, slide, zoom
 */

export class SceneTransition {
  constructor(engine) {
    this.engine = engine;
    this._overlay = null;
    this._isTransitioning = false;
  }

  get isTransitioning() { return this._isTransitioning; }

  _getOrCreateOverlay() {
    if (!this._overlay) {
      this._overlay = document.createElement('div');
      this._overlay.id = 'nova-scene-transition';
      this._overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 9999;
        pointer-events: none; opacity: 0;
        transition: none;
      `;
      document.body.appendChild(this._overlay);
    }
    return this._overlay;
  }

  /**
   * Fade to black (or any color), switch scene, fade back
   */
  async fade(targetScene, options = {}) {
    const { color = '#000000', duration = 500 } = options;
    if (this._isTransitioning) return;
    this._isTransitioning = true;

    const overlay = this._getOrCreateOverlay();
    overlay.style.background = color;
    overlay.style.transition = `opacity ${duration}ms ease`;
    overlay.style.opacity = '0';

    // Fade in
    await this._nextFrame();
    overlay.style.opacity = '1';
    await this._wait(duration);

    // Switch scene
    if (typeof targetScene === 'string') {
      await this.engine.scenes.load(targetScene);
    } else if (typeof targetScene === 'function') {
      await targetScene();
    }

    // Fade out
    await this._wait(100);
    overlay.style.opacity = '0';
    await this._wait(duration);

    this._isTransitioning = false;
  }

  /**
   * Wipe transition (horizontal or vertical)
   */
  async wipe(targetScene, options = {}) {
    const { direction = 'left', color = '#000000', duration = 600 } = options;
    if (this._isTransitioning) return;
    this._isTransitioning = true;

    const overlay = this._getOrCreateOverlay();
    overlay.style.background = color;
    overlay.style.transition = 'none';
    overlay.style.opacity = '1';

    const transforms = {
      left: { from: 'translateX(100%)', mid: 'translateX(0)', to: 'translateX(-100%)' },
      right: { from: 'translateX(-100%)', mid: 'translateX(0)', to: 'translateX(100%)' },
      up: { from: 'translateY(100%)', mid: 'translateY(0)', to: 'translateY(-100%)' },
      down: { from: 'translateY(-100%)', mid: 'translateY(0)', to: 'translateY(100%)' },
    };
    const t = transforms[direction] || transforms.left;

    overlay.style.transform = t.from;
    await this._nextFrame();
    overlay.style.transition = `transform ${duration / 2}ms ease-in`;
    overlay.style.transform = t.mid;
    await this._wait(duration / 2);

    // Switch scene
    if (typeof targetScene === 'string') {
      await this.engine.scenes.load(targetScene);
    } else if (typeof targetScene === 'function') {
      await targetScene();
    }

    await this._wait(50);
    overlay.style.transition = `transform ${duration / 2}ms ease-out`;
    overlay.style.transform = t.to;
    await this._wait(duration / 2);

    overlay.style.opacity = '0';
    this._isTransitioning = false;
  }

  /**
   * Circle/iris transition (like classic Mario)
   */
  async iris(targetScene, options = {}) {
    const { color = '#000000', duration = 800, centerX = 50, centerY = 50 } = options;
    if (this._isTransitioning) return;
    this._isTransitioning = true;

    const overlay = this._getOrCreateOverlay();
    overlay.style.background = color;
    overlay.style.opacity = '1';
    overlay.style.transition = 'none';
    overlay.style.clipPath = `circle(150% at ${centerX}% ${centerY}%)`;

    await this._nextFrame();
    overlay.style.transition = `clip-path ${duration / 2}ms ease-in`;
    overlay.style.clipPath = `circle(0% at ${centerX}% ${centerY}%)`;
    // Wait - but actually we want it to CLOSE, so reverse:
    overlay.style.clipPath = `circle(150% at ${centerX}% ${centerY}%)`;
    await this._nextFrame();
    overlay.style.transition = `clip-path ${duration / 2}ms ease-in`;
    overlay.style.clipPath = `circle(0% at ${centerX}% ${centerY}%)`;
    await this._wait(duration / 2);

    // Switch scene
    if (typeof targetScene === 'string') {
      await this.engine.scenes.load(targetScene);
    } else if (typeof targetScene === 'function') {
      await targetScene();
    }

    await this._wait(50);
    overlay.style.transition = `clip-path ${duration / 2}ms ease-out`;
    overlay.style.clipPath = `circle(150% at ${centerX}% ${centerY}%)`;
    await this._wait(duration / 2);

    overlay.style.opacity = '0';
    overlay.style.clipPath = '';
    this._isTransitioning = false;
  }

  /**
   * Loading screen transition
   */
  async loading(targetScene, options = {}) {
    const { message = 'Loading...', color = '#0d0f14', duration = 1000 } = options;
    if (this._isTransitioning) return;
    this._isTransitioning = true;

    const overlay = this._getOrCreateOverlay();
    overlay.style.background = color;
    overlay.style.transition = `opacity 300ms ease`;
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'all';
    overlay.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:16px;">
        <div style="width:40px;height:40px;border:3px solid rgba(255,255,255,0.15);border-top-color:#4ee6a0;border-radius:50%;animation:nova-spin 0.8s linear infinite;"></div>
        <div style="color:#6b7394;font-family:sans-serif;font-size:14px;letter-spacing:1px;">${message}</div>
      </div>
      <style>@keyframes nova-spin { to { transform: rotate(360deg); } }</style>
    `;

    await this._nextFrame();
    overlay.style.opacity = '1';
    await this._wait(400);

    // Load scene
    if (typeof targetScene === 'string') {
      await this.engine.scenes.load(targetScene);
    } else if (typeof targetScene === 'function') {
      await targetScene();
    }

    await this._wait(Math.max(0, duration - 400));
    overlay.style.opacity = '0';
    await this._wait(300);
    overlay.innerHTML = '';
    overlay.style.pointerEvents = 'none';
    this._isTransitioning = false;
  }

  // Helpers
  _wait(ms) { return new Promise(r => setTimeout(r, ms)); }
  _nextFrame() { return new Promise(r => requestAnimationFrame(r)); }
}
