/**
 * NovaStar Raycaster / Interaction System v0.4.2
 * Click on 3D objects, hover detection, UI interaction.
 * 
 * Usage:
 *   const ray = new RaycastInteraction(engine);
 *   ray.addClickable(mesh, () => console.log('Clicked!'));
 *   ray.addHoverable(mesh, { onEnter: ..., onExit: ... });
 *   ray.onClickAny((hit) => console.log(hit.object, hit.point));
 */

import * as THREE from 'three';

export class RaycastInteraction {
  constructor(engine) {
    this.engine = engine;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.enabled = true;

    // Registered interactive objects
    this._clickables = new Map();   // mesh -> { callback, data }
    this._hoverables = new Map();   // mesh -> { onEnter, onExit, onHover, isHovered, data }
    this._currentHovered = null;
    this._onClickAnyCallbacks = [];

    // Cursor style
    this._defaultCursor = 'default';
    this._hoverCursor = 'pointer';

    // Bind events
    this._onMouseMove = (e) => this._handleMouseMove(e);
    this._onClick = (e) => this._handleClick(e);
    this._onTouch = (e) => this._handleTouch(e);

    const canvas = engine.renderer?.three?.domElement;
    if (canvas) {
      canvas.addEventListener('mousemove', this._onMouseMove);
      canvas.addEventListener('click', this._onClick);
      canvas.addEventListener('touchstart', this._onTouch, { passive: false });
    }

    // Update hover state each frame
    engine.onUpdate(() => this._updateHover());
  }

  // ─── Registration ─────────────────────────────────
  /**
   * Make a mesh clickable
   * @param {THREE.Object3D} object - The mesh or group
   * @param {Function} callback - Called with { object, point, normal, distance }
   * @param {object} data - Optional extra data attached to this clickable
   */
  addClickable(object, callback, data = {}) {
    this._clickables.set(object, { callback, data });
    return this;
  }

  removeClickable(object) {
    this._clickables.delete(object);
    return this;
  }

  /**
   * Make a mesh hoverable
   * @param {THREE.Object3D} object
   * @param {object} handlers - { onEnter, onExit, onHover }
   */
  addHoverable(object, handlers = {}) {
    this._hoverables.set(object, {
      onEnter: handlers.onEnter || null,
      onExit: handlers.onExit || null,
      onHover: handlers.onHover || null,
      isHovered: false,
      data: handlers.data || {},
    });
    return this;
  }

  removeHoverable(object) {
    this._hoverables.delete(object);
    return this;
  }

  /**
   * Make a mesh both clickable and hoverable
   */
  addInteractive(object, onClick, hoverHandlers = {}, data = {}) {
    this.addClickable(object, onClick, data);
    this.addHoverable(object, { ...hoverHandlers, data });
    return this;
  }

  /**
   * Register a callback for clicking anywhere (hit or miss)
   */
  onClickAny(callback) {
    this._onClickAnyCallbacks.push(callback);
    return () => {
      this._onClickAnyCallbacks = this._onClickAnyCallbacks.filter(c => c !== callback);
    };
  }

  // ─── Raycasting ───────────────────────────────────
  /**
   * Cast a ray from the mouse position and return all hits
   */
  castFromMouse() {
    this.raycaster.setFromCamera(this.mouse, this.engine.camera);
    const objects = [...this._clickables.keys(), ...this._hoverables.keys()];
    return this.raycaster.intersectObjects(objects, true);
  }

  /**
   * Cast a ray from screen coordinates
   */
  castFromScreen(screenX, screenY) {
    const canvas = this.engine.renderer.three.domElement;
    const rect = canvas.getBoundingClientRect();
    this.mouse.set(
      ((screenX - rect.left) / rect.width) * 2 - 1,
      -((screenY - rect.top) / rect.height) * 2 + 1
    );
    return this.castFromMouse();
  }

  /**
   * Cast a ray from camera forward (for FPS crosshair interaction)
   */
  castFromCenter(maxDistance = 100) {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.engine.camera);
    this.raycaster.far = maxDistance;
    const objects = [...this._clickables.keys(), ...this._hoverables.keys()];
    return this.raycaster.intersectObjects(objects, true);
  }

  /**
   * Cast a ray from an arbitrary origin/direction
   */
  castRay(origin, direction, maxDistance = 100) {
    this.raycaster.set(origin, direction.normalize());
    this.raycaster.far = maxDistance;
    return this.raycaster.intersectObjects(this.engine.scene.children, true);
  }

  // ─── Event Handlers ───────────────────────────────
  _handleMouseMove(e) {
    const canvas = this.engine.renderer.three.domElement;
    const rect = canvas.getBoundingClientRect();
    this.mouse.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
  }

  _handleClick(e) {
    if (!this.enabled) return;

    this.raycaster.setFromCamera(this.mouse, this.engine.camera);
    const clickableObjects = [...this._clickables.keys()];
    const hits = this.raycaster.intersectObjects(clickableObjects, true);

    if (hits.length > 0) {
      const hit = hits[0];
      // Find which registered object was hit (could be a child mesh)
      let target = hit.object;
      while (target) {
        if (this._clickables.has(target)) {
          const { callback, data } = this._clickables.get(target);
          callback({
            object: target,
            point: hit.point,
            normal: hit.face?.normal,
            distance: hit.distance,
            data,
          });
          break;
        }
        target = target.parent;
      }
    }

    // Fire onClickAny callbacks
    this._onClickAnyCallbacks.forEach(cb => {
      cb(hits.length > 0 ? {
        object: hits[0].object,
        point: hits[0].point,
        distance: hits[0].distance,
      } : null);
    });
  }

  _handleTouch(e) {
    if (!this.enabled || !e.touches.length) return;
    const touch = e.touches[0];
    const canvas = this.engine.renderer.three.domElement;
    const rect = canvas.getBoundingClientRect();
    this.mouse.set(
      ((touch.clientX - rect.left) / rect.width) * 2 - 1,
      -((touch.clientY - rect.top) / rect.height) * 2 + 1
    );
    this._handleClick(e);
  }

  _updateHover() {
    if (!this.enabled) return;

    this.raycaster.setFromCamera(this.mouse, this.engine.camera);
    const hoverableObjects = [...this._hoverables.keys()];
    const hits = this.raycaster.intersectObjects(hoverableObjects, true);

    let newHovered = null;
    if (hits.length > 0) {
      let target = hits[0].object;
      while (target) {
        if (this._hoverables.has(target)) {
          newHovered = target;
          break;
        }
        target = target.parent;
      }
    }

    // Handle hover enter/exit
    const canvas = this.engine.renderer?.three?.domElement;
    if (newHovered !== this._currentHovered) {
      // Exit old
      if (this._currentHovered && this._hoverables.has(this._currentHovered)) {
        const h = this._hoverables.get(this._currentHovered);
        h.isHovered = false;
        if (h.onExit) h.onExit(this._currentHovered);
      }
      // Enter new
      if (newHovered && this._hoverables.has(newHovered)) {
        const h = this._hoverables.get(newHovered);
        h.isHovered = true;
        if (h.onEnter) h.onEnter(newHovered);
      }
      this._currentHovered = newHovered;

      // Update cursor
      if (canvas) {
        canvas.style.cursor = newHovered ? this._hoverCursor : this._defaultCursor;
      }
    }

    // Fire onHover for current
    if (this._currentHovered && this._hoverables.has(this._currentHovered)) {
      const h = this._hoverables.get(this._currentHovered);
      if (h.onHover && hits.length > 0) {
        h.onHover(this._currentHovered, hits[0].point);
      }
    }
  }

  // ─── Utilities ────────────────────────────────────
  /**
   * Set cursor styles
   */
  setCursor(defaultCursor, hoverCursor) {
    this._defaultCursor = defaultCursor;
    this._hoverCursor = hoverCursor;
  }

  /**
   * Remove all registered objects
   */
  clear() {
    this._clickables.clear();
    this._hoverables.clear();
    this._currentHovered = null;
    this._onClickAnyCallbacks = [];
  }

  dispose() {
    this.clear();
    const canvas = this.engine.renderer?.three?.domElement;
    if (canvas) {
      canvas.removeEventListener('mousemove', this._onMouseMove);
      canvas.removeEventListener('click', this._onClick);
      canvas.removeEventListener('touchstart', this._onTouch);
    }
  }
}
