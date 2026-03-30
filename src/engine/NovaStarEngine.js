/**
 * ╔══════════════════════════════════════════╗
 *  NOVASTAR ENGINE v0.1 — Core Runtime
 *  A cartoony low-poly 3D game engine
 * ╚══════════════════════════════════════════╝
 */

import * as THREE from 'three';
import { Renderer } from './Renderer.js';
import { AudioEngine } from './AudioEngine.js';
import { ParticleSystem } from './ParticleSystem.js';
import { InputManager } from './InputManager.js';
import { PhysicsWorld } from './PhysicsWorld.js';
import { SceneManager } from './SceneManager.js';
import { UISystem } from './UISystem.js';
import { AnimationSystem } from './AnimationSystem.js';
import { CameraSystem } from './CameraSystem.js';
import { TimerSystem } from './TimerSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { EventSystem } from './EventSystem.js';
import { System2D } from './System2D.js';
import { BuildSystem } from './BuildSystem.js';
import { AssetLoader } from './AssetLoader.js';
import { EntityManager } from './ComponentSystem.js';

export class NovaStarEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.options = {
      width: options.width || window.innerWidth,
      height: options.height || window.innerHeight,
      pixelRatio: options.pixelRatio || Math.min(window.devicePixelRatio, 2),
      debug: options.debug || false,
      ...options
    };

    // Engine state
    this.isRunning = false;
    this.isPaused = false;
    this.clock = new THREE.Clock();
    this.deltaTime = 0;
    this.elapsedTime = 0;
    this.frameCount = 0;
    this.fps = 0;
    this._fpsAccum = 0;
    this._fpsFrames = 0;

    // Callbacks
    this._updateCallbacks = [];
    this._fixedUpdateCallbacks = [];
    this._lateUpdateCallbacks = [];
    this._fixedTimeStep = 1 / 60;
    this._fixedAccumulator = 0;

    // Subsystems
    this.renderer = null;
    this.audio = null;
    this.particles = null;
    this.input = null;
    this.physics = null;
    this.scenes = null;
    this.ui = null;
    this.anim = null;
    this.cam = null;
    this.timers = null;
    this.save = null;
    this.events = null;
    this.system2d = null;
    this.build = null;
    this.assets = null;
    this.entityManager = null;

    // Entity system
    this.entities = new Map();
    this._entityIdCounter = 0;

    this._init();
  }

  _init() {
    // Initialize Three.js scene
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      this.options.width / this.options.height,
      0.1, 1000
    );
    this.camera.position.set(0, 8, 12);
    this.camera.lookAt(0, 0, 0);

    // Initialize subsystems
    this.renderer = new Renderer(this);
    this.audio = new AudioEngine();
    this.particles = new ParticleSystem(this);
    this.input = new InputManager(this);
    this.physics = new PhysicsWorld(this);
    this.scenes = new SceneManager(this);
    this.ui = new UISystem(this);
    this.anim = new AnimationSystem(this);
    this.cam = new CameraSystem(this);
    this.timers = new TimerSystem(this);
    this.save = new SaveSystem(options.gameId || 'novastar');
    this.events = new EventSystem();
    this.system2d = new System2D(this);
    this.build = new BuildSystem(this);
    this.assets = new AssetLoader(this);
    this.entityManager = new EntityManager(this);

    // Handle resize
    window.addEventListener('resize', () => this._onResize());

    console.log(
      '%c⭐ NovaStar Engine v0.1 initialized',
      'color: #5ff59a; font-weight: bold; font-size: 14px;'
    );
  }

  // ─── GAME LOOP ─────────────────────────────────
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    this.audio.init();
    this._loop();
  }

  stop() {
    this.isRunning = false;
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
    this.clock.start(); // Reset delta
  }

  _loop() {
    if (!this.isRunning) return;
    requestAnimationFrame(() => this._loop());

    this.deltaTime = Math.min(this.clock.getDelta(), 0.1); // Cap delta
    this.elapsedTime = this.clock.getElapsedTime();
    this.frameCount++;

    // FPS counter
    this._fpsAccum += this.deltaTime;
    this._fpsFrames++;
    if (this._fpsAccum >= 1) {
      this.fps = this._fpsFrames;
      this._fpsAccum = 0;
      this._fpsFrames = 0;
    }

    if (this.isPaused) return;

    // Fixed update (physics)
    this._fixedAccumulator += this.deltaTime;
    while (this._fixedAccumulator >= this._fixedTimeStep) {
      this.physics.step(this._fixedTimeStep);
      for (const cb of this._fixedUpdateCallbacks) cb(this._fixedTimeStep);
      this._fixedAccumulator -= this._fixedTimeStep;
    }

    // Update
    for (const cb of this._updateCallbacks) cb(this.deltaTime);

    // Update subsystems
    this.particles.update(this.deltaTime);
    this.input.update();

    // Late update (camera, etc.)
    for (const cb of this._lateUpdateCallbacks) cb(this.deltaTime);

    // Render
    this.renderer.render(this.scene, this.camera);
  }

  // ─── CALLBACK REGISTRATION ─────────────────────
  onUpdate(callback) {
    this._updateCallbacks.push(callback);
    return () => {
      const i = this._updateCallbacks.indexOf(callback);
      if (i !== -1) this._updateCallbacks.splice(i, 1);
    };
  }

  onFixedUpdate(callback) {
    this._fixedUpdateCallbacks.push(callback);
    return () => {
      const i = this._fixedUpdateCallbacks.indexOf(callback);
      if (i !== -1) this._fixedUpdateCallbacks.splice(i, 1);
    };
  }

  onLateUpdate(callback) {
    this._lateUpdateCallbacks.push(callback);
    return () => {
      const i = this._lateUpdateCallbacks.indexOf(callback);
      if (i !== -1) this._lateUpdateCallbacks.splice(i, 1);
    };
  }

  // ─── ENTITY MANAGEMENT ─────────────────────────
  createEntity(name = 'Entity') {
    const id = ++this._entityIdCounter;
    const entity = {
      id,
      name,
      components: new Map(),
      mesh: null,
      position: new THREE.Vector3(),
      rotation: new THREE.Euler(),
      scale: new THREE.Vector3(1, 1, 1),
      active: true,
      tags: new Set(),

      addComponent(type, data) {
        this.components.set(type, data);
        return this;
      },
      getComponent(type) {
        return this.components.get(type);
      },
      hasTag(tag) {
        return this.tags.has(tag);
      },
      addTag(tag) {
        this.tags.add(tag);
        return this;
      }
    };

    this.entities.set(id, entity);
    return entity;
  }

  destroyEntity(id) {
    const entity = this.entities.get(id);
    if (entity && entity.mesh) {
      this.scene.remove(entity.mesh);
    }
    this.entities.delete(id);
  }

  findEntitiesByTag(tag) {
    const result = [];
    for (const entity of this.entities.values()) {
      if (entity.hasTag(tag)) result.push(entity);
    }
    return result;
  }

  // ─── UTILITIES ─────────────────────────────────
  _onResize() {
    this.options.width = window.innerWidth;
    this.options.height = window.innerHeight;
    this.camera.aspect = this.options.width / this.options.height;
    this.camera.updateProjectionMatrix();
    this.renderer.resize(this.options.width, this.options.height);
  }

  // Quick access to add objects to the scene
  add(object) {
    this.scene.add(object);
    return object;
  }

  remove(object) {
    this.scene.remove(object);
  }
}
