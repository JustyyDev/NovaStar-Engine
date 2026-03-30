/**
 * NovaStar Scene Manager
 * Handles loading, switching, and managing game scenes/levels
 */

export class SceneManager {
  constructor(engine) {
    this.engine = engine;
    this._scenes = new Map();
    this._currentScene = null;
    this._currentSceneName = null;
  }

  /**
   * Register a scene
   * @param {string} name - Scene name
   * @param {object} scene - Scene definition with init(), update(), cleanup()
   */
  register(name, scene) {
    this._scenes.set(name, scene);
  }

  /**
   * Load and switch to a scene
   */
  async load(name) {
    const sceneDef = this._scenes.get(name);
    if (!sceneDef) {
      console.error(`[NovaStar] Scene "${name}" not found`);
      return;
    }

    // Cleanup current scene
    if (this._currentScene && this._currentScene.cleanup) {
      this._currentScene.cleanup(this.engine);
    }

    // Clear the Three.js scene (except lights/camera)
    const toRemove = [];
    this.engine.scene.traverse((child) => {
      if (child.isLight || child === this.engine.camera) return;
      if (child.parent === this.engine.scene) toRemove.push(child);
    });
    toRemove.forEach(obj => this.engine.scene.remove(obj));

    // Clear physics
    this.engine.physics.bodies.length = 0;

    // Clear entities
    this.engine.entities.clear();

    // Clear particles
    this.engine.particles.clear();

    // Clear callbacks
    this.engine._updateCallbacks.length = 0;
    this.engine._fixedUpdateCallbacks.length = 0;
    this.engine._lateUpdateCallbacks.length = 0;

    // Initialize new scene
    this._currentScene = sceneDef;
    this._currentSceneName = name;

    if (sceneDef.init) {
      await sceneDef.init(this.engine);
    }

    console.log(`[NovaStar] Scene loaded: ${name}`);
  }

  get current() { return this._currentSceneName; }

  /**
   * Reload the current scene
   */
  async reload() {
    if (this._currentSceneName) {
      await this.load(this._currentSceneName);
    }
  }
}
