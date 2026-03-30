/**
 * NovaStar Component System
 * Entity-Component architecture for building any type of game
 * Entities are containers, Components hold data and behavior
 */

import * as THREE from 'three';

// ─── BASE COMPONENT ──────────────────────────────
export class Component {
  constructor() {
    this.entity = null;
    this.enabled = true;
  }

  /** Called when component is added to an entity */
  onAttach(entity) { this.entity = entity; }

  /** Called once when the entity starts */
  onStart() {}

  /** Called every frame */
  onUpdate(dt) {}

  /** Called at fixed physics rate */
  onFixedUpdate(dt) {}

  /** Called after all updates */
  onLateUpdate(dt) {}

  /** Called when entity is destroyed */
  onDestroy() {}

  /** Get another component on the same entity */
  getComponent(ComponentClass) {
    return this.entity?.getComponent(ComponentClass);
  }
}


// ─── ENTITY ──────────────────────────────────────
export class Entity {
  constructor(engine, name = 'Entity') {
    this.engine = engine;
    this.name = name;
    this.id = ++Entity._idCounter;
    this.active = true;
    this.tags = new Set();
    this.components = new Map();
    this.children = [];
    this.parent = null;

    // Transform
    this.object3D = new THREE.Group();
    this.object3D.name = name;
    this.object3D.userData._entity = this;

    this._started = false;
  }

  get position() { return this.object3D.position; }
  get rotation() { return this.object3D.rotation; }
  get scale() { return this.object3D.scale; }

  // ─── COMPONENT MANAGEMENT ──────────────────────
  addComponent(ComponentClass, ...args) {
    const comp = new ComponentClass(...args);
    this.components.set(ComponentClass, comp);
    comp.onAttach(this);
    if (this._started) comp.onStart();
    return comp;
  }

  getComponent(ComponentClass) {
    return this.components.get(ComponentClass) || null;
  }

  hasComponent(ComponentClass) {
    return this.components.has(ComponentClass);
  }

  removeComponent(ComponentClass) {
    const comp = this.components.get(ComponentClass);
    if (comp) {
      comp.onDestroy();
      this.components.delete(ComponentClass);
    }
  }

  // ─── TAGS ──────────────────────────────────────
  addTag(tag) { this.tags.add(tag); return this; }
  hasTag(tag) { return this.tags.has(tag); }
  removeTag(tag) { this.tags.delete(tag); }

  // ─── HIERARCHY ─────────────────────────────────
  addChild(childEntity) {
    childEntity.parent = this;
    this.children.push(childEntity);
    this.object3D.add(childEntity.object3D);
    return this;
  }

  removeChild(childEntity) {
    const idx = this.children.indexOf(childEntity);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      childEntity.parent = null;
      this.object3D.remove(childEntity.object3D);
    }
  }

  // ─── LIFECYCLE ─────────────────────────────────
  start() {
    if (this._started) return;
    this._started = true;
    for (const comp of this.components.values()) {
      if (comp.enabled) comp.onStart();
    }
    for (const child of this.children) child.start();
  }

  update(dt) {
    if (!this.active) return;
    for (const comp of this.components.values()) {
      if (comp.enabled) comp.onUpdate(dt);
    }
    for (const child of this.children) child.update(dt);
  }

  fixedUpdate(dt) {
    if (!this.active) return;
    for (const comp of this.components.values()) {
      if (comp.enabled) comp.onFixedUpdate(dt);
    }
    for (const child of this.children) child.fixedUpdate(dt);
  }

  lateUpdate(dt) {
    if (!this.active) return;
    for (const comp of this.components.values()) {
      if (comp.enabled) comp.onLateUpdate(dt);
    }
    for (const child of this.children) child.lateUpdate(dt);
  }

  destroy() {
    for (const comp of this.components.values()) comp.onDestroy();
    this.components.clear();
    for (const child of [...this.children]) child.destroy();
    if (this.parent) this.parent.removeChild(this);
    if (this.object3D.parent) this.object3D.parent.remove(this.object3D);
    this.active = false;
  }
}
Entity._idCounter = 0;


// ─── ENTITY MANAGER ──────────────────────────────
export class EntityManager {
  constructor(engine) {
    this.engine = engine;
    this.entities = new Map();
    this.root = new THREE.Group();
    this.root.name = 'Entities';
    engine.scene.add(this.root);

    engine.onUpdate((dt) => this._update(dt));
    engine.onFixedUpdate((dt) => this._fixedUpdate(dt));
    engine.onLateUpdate((dt) => this._lateUpdate(dt));
  }

  create(name = 'Entity') {
    const entity = new Entity(this.engine, name);
    this.entities.set(entity.id, entity);
    this.root.add(entity.object3D);
    return entity;
  }

  destroy(entity) {
    entity.destroy();
    this.entities.delete(entity.id);
  }

  find(name) {
    for (const entity of this.entities.values()) {
      if (entity.name === name) return entity;
    }
    return null;
  }

  findByTag(tag) {
    const result = [];
    for (const entity of this.entities.values()) {
      if (entity.hasTag(tag)) result.push(entity);
    }
    return result;
  }

  findAll(predicate) {
    const result = [];
    for (const entity of this.entities.values()) {
      if (predicate(entity)) result.push(entity);
    }
    return result;
  }

  _update(dt) {
    for (const entity of this.entities.values()) {
      if (!entity._started) entity.start();
      entity.update(dt);
    }
  }

  _fixedUpdate(dt) {
    for (const entity of this.entities.values()) {
      entity.fixedUpdate(dt);
    }
  }

  _lateUpdate(dt) {
    for (const entity of this.entities.values()) {
      entity.lateUpdate(dt);
    }
  }

  clear() {
    for (const entity of [...this.entities.values()]) {
      this.destroy(entity);
    }
  }

  get count() {
    return this.entities.size;
  }
}


// ═══════════════════════════════════════════════════
//  BUILT-IN COMPONENTS
// ═══════════════════════════════════════════════════

/** Renders a mesh */
export class MeshRenderer extends Component {
  constructor(mesh) {
    super();
    this.mesh = mesh;
  }

  onAttach(entity) {
    super.onAttach(entity);
    if (this.mesh) entity.object3D.add(this.mesh);
  }

  onDestroy() {
    if (this.mesh && this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }
  }
}

/** Physics body component */
export class RigidBody extends Component {
  constructor(options = {}) {
    super();
    this.body = null;
    this.options = options;
  }

  onStart() {
    this.body = this.entity.engine.physics.createBody({
      position: this.entity.position.clone(),
      ...this.options
    });
  }

  onUpdate(dt) {
    if (this.body && !this.body.isStatic) {
      this.entity.position.copy(this.body.position);
    }
  }

  onFixedUpdate(dt) {
    if (this.body && this.body.isStatic) {
      this.body.position.copy(this.entity.position);
    }
  }

  get isGrounded() { return this.body?.isGrounded || false; }
  get velocity() { return this.body?.velocity; }

  onDestroy() {
    if (this.body) {
      this.entity.engine.physics.removeBody(this.body);
    }
  }
}

/** Auto-rotate component */
export class AutoRotate extends Component {
  constructor(speed = 1, axis = 'y') {
    super();
    this.speed = speed;
    this.axis = axis;
  }

  onUpdate(dt) {
    this.entity.rotation[this.axis] += this.speed * dt;
  }
}

/** Auto-bob component */
export class AutoBob extends Component {
  constructor(amplitude = 0.5, speed = 2) {
    super();
    this.amplitude = amplitude;
    this.speed = speed;
    this._startY = 0;
    this._time = 0;
  }

  onStart() {
    this._startY = this.entity.position.y;
  }

  onUpdate(dt) {
    this._time += dt;
    this.entity.position.y = this._startY + Math.sin(this._time * this.speed) * this.amplitude;
  }
}

/** Patrol between points */
export class Patrol extends Component {
  constructor(points, speed = 2) {
    super();
    this.points = points; // Array of THREE.Vector3
    this.speed = speed;
    this._index = 0;
  }

  onUpdate(dt) {
    if (this.points.length < 2) return;
    const target = this.points[this._index];
    const pos = this.entity.position;
    const dir = target.clone().sub(pos);
    const dist = dir.length();

    if (dist < 0.1) {
      this._index = (this._index + 1) % this.points.length;
    } else {
      dir.normalize().multiplyScalar(this.speed * dt);
      pos.add(dir);
    }
  }
}

/** Trigger zone component */
export class TriggerZone extends Component {
  constructor(options = {}) {
    super();
    this.onEnter = options.onEnter || null;
    this.onStay = options.onStay || null;
    this.onExit = options.onExit || null;
    this.tag = options.tag || 'trigger';
    this._body = null;
  }

  onStart() {
    this._body = this.entity.engine.physics.createBody({
      position: this.entity.position.clone(),
      halfExtents: this.entity.scale.clone().multiplyScalar(0.5),
      isStatic: true,
      isTrigger: true,
      tag: this.tag,
      owner: this.entity,
    });
    this._body.onTriggerEnter = (other) => {
      if (this.onEnter) this.onEnter(other);
    };
  }

  onUpdate(dt) {
    if (this._body) this._body.position.copy(this.entity.position);
  }

  onDestroy() {
    if (this._body) this.entity.engine.physics.removeBody(this._body);
  }
}

/** Health component */
export class Health extends Component {
  constructor(maxHealth = 100) {
    super();
    this.maxHealth = maxHealth;
    this.current = maxHealth;
    this.invulnerable = false;
    this.onDamage = null;
    this.onHeal = null;
    this.onDeath = null;
  }

  damage(amount) {
    if (this.invulnerable || this.current <= 0) return;
    this.current = Math.max(0, this.current - amount);
    if (this.onDamage) this.onDamage(amount, this.current);
    if (this.current <= 0 && this.onDeath) this.onDeath();
  }

  heal(amount) {
    const prev = this.current;
    this.current = Math.min(this.maxHealth, this.current + amount);
    if (this.onHeal) this.onHeal(this.current - prev, this.current);
  }

  get percentage() { return this.current / this.maxHealth; }
  get isDead() { return this.current <= 0; }

  reset() { this.current = this.maxHealth; }
}
