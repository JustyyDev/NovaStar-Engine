/**
 * NovaStar Sprite & Overlay System v0.4.2
 * 2D image/sprite rendering on top of the 3D scene.
 * 
 * Features:
 * - Fullscreen overlays (jumpscares, cutscenes, menus)
 * - HUD sprites (minimap frames, camera feeds)
 * - Billboarded world sprites (floating text, health bars above enemies)
 * - Animated sprite sheets
 * - Timed display with callbacks
 * 
 * Usage:
 *   const sprites = new SpriteSystem(engine);
 *   sprites.showOverlay('jumpscare.png', { duration: 0.5, fade: true });
 *   sprites.addHUDSprite('minimap', 'map.png', { x: 20, y: 20, width: 200 });
 *   sprites.addWorldSprite('label', 'icon.png', position, { billboard: true });
 */

import * as THREE from 'three';

export class SpriteSystem {
  constructor(engine) {
    this.engine = engine;
    this._textureLoader = new THREE.TextureLoader();
    this._texCache = new Map();

    // DOM overlay container
    this._overlayContainer = null;
    this._hudContainer = null;
    this._overlays = new Map();
    this._hudSprites = new Map();
    this._worldSprites = new Map();

    this._createContainers();
    engine.onUpdate((dt) => this._update(dt));
  }

  _createContainers() {
    // Fullscreen overlay container (for jumpscares, cutscenes)
    this._overlayContainer = document.createElement('div');
    this._overlayContainer.id = 'nova-overlay';
    this._overlayContainer.style.cssText = 'position:fixed;inset:0;z-index:500;pointer-events:none;display:flex;align-items:center;justify-content:center;';
    document.body.appendChild(this._overlayContainer);

    // HUD sprite container
    this._hudContainer = document.createElement('div');
    this._hudContainer.id = 'nova-hud-sprites';
    this._hudContainer.style.cssText = 'position:fixed;inset:0;z-index:100;pointer-events:none;';
    document.body.appendChild(this._hudContainer);
  }

  // ═══════════════════════════════════════════════════
  // FULLSCREEN OVERLAYS
  // ═══════════════════════════════════════════════════

  /**
   * Show a fullscreen image overlay (jumpscare, cutscene, etc.)
   * @param {string} imagePath - URL or path to image
   * @param {object} options - { duration, fade, fadeIn, fadeOut, color, onClick, onComplete, opacity, cover }
   * @returns {string} overlay ID for manual removal
   */
  showOverlay(imagePath, options = {}) {
    const {
      duration = null,  // null = stays until removed
      fade = false,
      fadeIn = fade ? 0.1 : 0,
      fadeOut = fade ? 0.3 : 0,
      color = null,     // solid color instead of image
      onClick = null,
      onComplete = null,
      opacity = 1,
      cover = true,     // true = cover entire screen
      zIndex = 500,
    } = options;

    const id = 'overlay_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;inset:0;z-index:${zIndex};display:flex;align-items:center;justify-content:center;transition:opacity ${fadeIn}s;opacity:0;`;

    if (color) {
      el.style.background = color;
    } else if (imagePath) {
      if (cover) {
        el.style.background = `url("${imagePath}") center/cover no-repeat`;
      } else {
        const img = document.createElement('img');
        img.src = imagePath;
        img.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;';
        el.appendChild(img);
      }
    }

    if (onClick) {
      el.style.pointerEvents = 'auto';
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        onClick();
        this.removeOverlay(id);
      });
    }

    this._overlayContainer.appendChild(el);
    this._overlays.set(id, { el, fadeOut, onComplete, startTime: Date.now(), duration });

    // Fade in
    requestAnimationFrame(() => { el.style.opacity = String(opacity); });

    // Auto-remove after duration
    if (duration !== null) {
      setTimeout(() => this.removeOverlay(id), duration * 1000);
    }

    return id;
  }

  /**
   * Remove an overlay
   */
  removeOverlay(id) {
    const overlay = this._overlays.get(id);
    if (!overlay) return;

    const { el, fadeOut, onComplete } = overlay;
    el.style.transition = `opacity ${fadeOut}s`;
    el.style.opacity = '0';

    setTimeout(() => {
      el.remove();
      this._overlays.delete(id);
      if (onComplete) onComplete();
    }, fadeOut * 1000);
  }

  /**
   * Flash the screen a color (damage, pickup, etc.)
   */
  flash(color = '#ff0000', duration = 0.3, opacity = 0.5) {
    return this.showOverlay(null, { color, duration, fade: true, opacity });
  }

  /**
   * Show a jumpscare (fullscreen image, brief duration, optional sound)
   */
  jumpscare(imagePath, options = {}) {
    const {
      duration = 0.8,
      sound = null,
      shakeIntensity = 8,
      shakeDuration = 0.3,
    } = options;

    if (sound && this.engine.audio) {
      this.engine.audio.play(sound, { volume: 1 });
    }
    if (this.engine.cam) {
      this.engine.cam.shake(shakeIntensity, shakeDuration);
    }

    return this.showOverlay(imagePath, {
      duration,
      fadeIn: 0.02,
      fadeOut: 0.15,
      cover: true,
      zIndex: 600,
    });
  }

  /**
   * Remove all overlays
   */
  clearOverlays() {
    for (const [id] of this._overlays) {
      this.removeOverlay(id);
    }
  }

  // ═══════════════════════════════════════════════════
  // HUD SPRITES (fixed screen position)
  // ═══════════════════════════════════════════════════

  /**
   * Add a sprite to the HUD at a fixed screen position
   * @param {string} name - Unique identifier
   * @param {string} imagePath - Image URL
   * @param {object} options - { x, y, width, height, anchor, opacity, onClick }
   */
  addHUDSprite(name, imagePath, options = {}) {
    const {
      x = 0, y = 0,
      width = 100, height = null,
      anchor = 'top-left', // 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'
      opacity = 1,
      onClick = null,
      className = '',
    } = options;

    const el = document.createElement('div');
    el.style.cssText = `position:absolute;width:${width}px;${height ? `height:${height}px;` : ''}opacity:${opacity};pointer-events:${onClick ? 'auto' : 'none'};cursor:${onClick ? 'pointer' : 'default'};`;

    // Anchor positioning
    switch (anchor) {
      case 'top-left': el.style.top = y + 'px'; el.style.left = x + 'px'; break;
      case 'top-right': el.style.top = y + 'px'; el.style.right = x + 'px'; break;
      case 'bottom-left': el.style.bottom = y + 'px'; el.style.left = x + 'px'; break;
      case 'bottom-right': el.style.bottom = y + 'px'; el.style.right = x + 'px'; break;
      case 'center': el.style.top = '50%'; el.style.left = '50%'; el.style.transform = 'translate(-50%,-50%)'; break;
    }

    if (imagePath) {
      const img = document.createElement('img');
      img.src = imagePath;
      img.style.cssText = 'width:100%;height:100%;object-fit:contain;';
      el.appendChild(img);
    }

    if (onClick) el.addEventListener('click', onClick);
    if (className) el.className = className;

    this._hudContainer.appendChild(el);
    this._hudSprites.set(name, { el, options });

    return el;
  }

  /**
   * Add an HTML HUD element (for custom UI)
   */
  addHUDElement(name, htmlContent, options = {}) {
    const el = this.addHUDSprite(name, null, options);
    el.innerHTML = htmlContent;
    el.style.pointerEvents = 'auto';
    return el;
  }

  /**
   * Update a HUD sprite's image
   */
  updateHUDSprite(name, imagePath) {
    const sprite = this._hudSprites.get(name);
    if (!sprite) return;
    const img = sprite.el.querySelector('img');
    if (img) img.src = imagePath;
  }

  /**
   * Remove a HUD sprite
   */
  removeHUDSprite(name) {
    const sprite = this._hudSprites.get(name);
    if (sprite) {
      sprite.el.remove();
      this._hudSprites.delete(name);
    }
  }

  /**
   * Show/hide a HUD sprite
   */
  setHUDSpriteVisible(name, visible) {
    const sprite = this._hudSprites.get(name);
    if (sprite) sprite.el.style.display = visible ? '' : 'none';
  }

  // ═══════════════════════════════════════════════════
  // WORLD SPRITES (billboarded in 3D space)
  // ═══════════════════════════════════════════════════

  /**
   * Add a sprite in 3D world space (billboarded towards camera)
   * @param {string} name - Unique identifier
   * @param {string} imagePath - Image URL
   * @param {THREE.Vector3} position - World position
   * @param {object} options - { scale, billboard, opacity }
   */
  addWorldSprite(name, imagePath, position, options = {}) {
    const {
      scale = 1,
      billboard = true,
      opacity = 1,
      emissive = false,
    } = options;

    const tex = this._loadTexture(imagePath);
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      opacity,
      ...(emissive ? { color: 0xffffff } : {}),
    });

    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(position);
    sprite.scale.set(scale, scale, 1);
    this.engine.scene.add(sprite);

    this._worldSprites.set(name, { sprite, billboard });
    return sprite;
  }

  /**
   * Update a world sprite's position
   */
  updateWorldSpritePosition(name, position) {
    const ws = this._worldSprites.get(name);
    if (ws) ws.sprite.position.copy(position);
  }

  /**
   * Remove a world sprite
   */
  removeWorldSprite(name) {
    const ws = this._worldSprites.get(name);
    if (ws) {
      this.engine.scene.remove(ws.sprite);
      ws.sprite.material.dispose();
      this._worldSprites.delete(name);
    }
  }

  // ─── Internal ─────────────────────────────────────
  _loadTexture(path) {
    if (this._texCache.has(path)) return this._texCache.get(path);
    const tex = this._textureLoader.load(path);
    tex.colorSpace = THREE.SRGBColorSpace;
    this._texCache.set(path, tex);
    return tex;
  }

  _update(dt) {
    // World sprites are auto-billboarded by Three.js Sprite class
    // Additional animation logic could go here
  }

  /**
   * Clean up everything
   */
  dispose() {
    this.clearOverlays();
    for (const [name] of this._hudSprites) this.removeHUDSprite(name);
    for (const [name] of this._worldSprites) this.removeWorldSprite(name);
    if (this._overlayContainer) this._overlayContainer.remove();
    if (this._hudContainer) this._hudContainer.remove();
  }
}
