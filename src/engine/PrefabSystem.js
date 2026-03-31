/**
 * NovaStar Prefab System v0.3
 * Reusable entity templates with instantiation and batch updates
 * 
 * Integrates with: ComponentSystem.js (Entity, EntityManager), 
 *                  EditorApp.js (hierarchy, inspector)
 */

import * as THREE from 'three';

// ─── Prefab Definition ────────────────────────────────────────────
export class Prefab {
  constructor(data = {}) {
    this.id = data.id || _uid();
    this.name = data.name || 'New Prefab';
    this.description = data.description || '';
    this.category = data.category || 'general';
    this.createdAt = data.createdAt || Date.now();
    this.modifiedAt = Date.now();

    // Blueprint: component configs (not live instances)
    this.components = data.components || [];
    this.tags = data.tags || [];
    this.layer = data.layer || 'Default';

    // Default transform
    this.transform = data.transform || {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale:    { x: 1, y: 1, z: 1 },
    };

    // Nested children (other prefab refs or raw entity data)
    this.children = data.children || [];
  }

  /**
   * Spawn a scene entity from this prefab
   * @param {object} overrides - position, rotation, scale, name overrides
   * @returns {object} Entity-shaped data ready for EditorApp.addEntity or EntityManager
   */
  instantiate(overrides = {}) {
    const pos = { ...this.transform.position, ...(overrides.position || {}) };
    const rot = { ...this.transform.rotation, ...(overrides.rotation || {}) };
    const scl = { ...this.transform.scale, ...(overrides.scale || {}) };

    return {
      id: _uid(),
      prefabId: this.id,
      prefabName: this.name,
      name: overrides.name || this.name,
      type: this._inferType(),
      position: new THREE.Vector3(pos.x, pos.y, pos.z),
      rotation: new THREE.Euler(rot.x, rot.y, rot.z),
      scale: new THREE.Vector3(scl.x, scl.y, scl.z),
      components: this.components.map(c => ({ ...c })),
      tags: [...this.tags],
      layer: this.layer,
      active: true,
      isPrefabInstance: true,
    };
  }

  /** Infer entity type from components for the editor */
  _inferType() {
    const types = this.components.map(c => c.type);
    if (types.includes('InputController') || types.includes('TopDownController')) return 'character';
    if (types.includes('PatrolAI') || types.includes('Health')) return 'enemy';
    if (types.some(t => t.includes('Mesh') && !t.includes('character'))) {
      if (this.tags.includes('coin') || this.tags.includes('collectible')) return 'star';
      return 'platform';
    }
    return 'entity';
  }

  toJSON() {
    this.modifiedAt = Date.now();
    return {
      id: this.id, name: this.name, description: this.description,
      category: this.category, createdAt: this.createdAt, modifiedAt: this.modifiedAt,
      components: this.components, tags: this.tags, layer: this.layer,
      transform: this.transform, children: this.children,
    };
  }

  static fromJSON(data) {
    return new Prefab(data);
  }
}

// ─── Prefab Library ───────────────────────────────────────────────
export class PrefabLibrary {
  constructor() {
    this.prefabs = new Map();
    this._listeners = [];
  }

  add(prefab) {
    if (!(prefab instanceof Prefab)) prefab = new Prefab(prefab);
    this.prefabs.set(prefab.id, prefab);
    this._emit('add', prefab);
    return prefab;
  }

  remove(id) {
    const p = this.prefabs.get(id);
    if (p) { this.prefabs.delete(id); this._emit('remove', p); }
    return p;
  }

  get(id) { return this.prefabs.get(id); }
  getAll() { return [...this.prefabs.values()]; }
  getByName(name) { return this.getAll().find(p => p.name === name); }
  getByCategory(cat) { return this.getAll().filter(p => p.category === cat); }
  get count() { return this.prefabs.size; }

  /**
   * Create a prefab from a live editor entity
   */
  createFromEntity(entity) {
    const prefab = new Prefab({
      name: entity.name,
      category: entity.type === 'character' ? 'character' :
                entity.type === 'enemy' ? 'enemy' :
                entity.type === 'star' ? 'item' : 'environment',
      components: entity.components ? [...entity.components.entries()].map(([type, data]) => ({ type, ...data })) : [],
      tags: entity.tags ? [...entity.tags] : [],
      transform: {
        position: { x: entity.position?.x || 0, y: entity.position?.y || 0, z: entity.position?.z || 0 },
        rotation: { x: entity.rotation?.x || 0, y: entity.rotation?.y || 0, z: entity.rotation?.z || 0 },
        scale:    { x: entity.scale?.x || 1, y: entity.scale?.y || 1, z: entity.scale?.z || 1 },
      },
    });
    return this.add(prefab);
  }

  /**
   * Push prefab changes to all instances in an entity list
   * Preserves instance-specific position/name
   */
  applyToInstances(prefabId, entities) {
    const prefab = this.get(prefabId);
    if (!prefab) return 0;
    let count = 0;
    for (const entity of entities) {
      if (entity.prefabId === prefabId) {
        entity.components = new Map(prefab.components.map(c => [c.type, { ...c }]));
        entity.tags = new Set(prefab.tags);
        entity.layer = prefab.layer;
        count++;
      }
    }
    this._emit('apply', { prefab, count });
    return count;
  }

  onChange(fn) { this._listeners.push(fn); return () => { this._listeners = this._listeners.filter(f => f !== fn); }; }
  _emit(type, data) { this._listeners.forEach(fn => fn(type, data)); }

  toJSON() { return this.getAll().map(p => p.toJSON()); }
  static fromJSON(arr) {
    const lib = new PrefabLibrary();
    (arr || []).forEach(d => lib.add(Prefab.fromJSON(d)));
    return lib;
  }
}

// ─── Project Config ───────────────────────────────────────────────
export class ProjectConfig {
  constructor(data = {}) {
    this.name = data.name || 'Untitled Project';
    this.version = data.version || '1.0.0';
    this.description = data.description || '';
    this.engineVersion = '0.4.1';
    this.createdAt = data.createdAt || Date.now();
    this.modifiedAt = Date.now();

    this.resolution = data.resolution || { width: 1280, height: 720 };
    this.targetFPS = data.targetFPS || 60;
    this.physics = data.physics || { gravity: -25, fixedTimestep: 1/60 };
    this.renderer = data.renderer || {
      skyColorTop: '#6ec6ff', skyColorBottom: '#b8e8ff',
      fogColor: '#b8e8ff', fogNear: 30, fogFar: 80,
      enableShadows: true,
    };
    this.audio = data.audio || { masterVolume: 1.0, sfxVolume: 0.8, musicVolume: 0.6 };
    this.build = data.build || { targets: ['web'] };
    this.tags = data.tags || ['player','enemy','ground','coin','trigger','projectile'];
    this.layers = data.layers || ['Default','Player','Enemies','Environment','UI','Triggers'];
    this.scenes = data.scenes || [];
    this.startScene = data.startScene || null;
  }

  toJSON() { this.modifiedAt = Date.now(); return { ...this }; }
  static fromJSON(d) { return new ProjectConfig(d); }
}

// ─── Undo History ─────────────────────────────────────────────────
export class UndoHistory {
  constructor(max = 80) {
    this.undoStack = [];
    this.redoStack = [];
    this.max = max;
  }

  push(action) {
    // action = { name, undo(), redo() }
    this.undoStack.push(action);
    if (this.undoStack.length > this.max) this.undoStack.shift();
    this.redoStack = [];
  }

  undo() {
    const a = this.undoStack.pop();
    if (a) { this.redoStack.push(a); a.undo(); }
    return a;
  }

  redo() {
    const a = this.redoStack.pop();
    if (a) { this.undoStack.push(a); a.redo(); }
    return a;
  }

  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }
  clear() { this.undoStack = []; this.redoStack = []; }
}

// ─── Project Manager (orchestrator) ───────────────────────────────
export class ProjectManager {
  constructor() {
    this.config = new ProjectConfig();
    this.prefabs = new PrefabLibrary();
    this.history = new UndoHistory();
    this._dirty = false;
    this._recent = this._loadRecent();
  }

  /** Serialize entire project to .novastar JSON */
  serialize(editorEntities = []) {
    return {
      format: 'novastar-project',
      engineVersion: '0.4.1',
      config: this.config.toJSON(),
      prefabs: this.prefabs.toJSON(),
      entities: editorEntities.map(e => ({
        name: e.name, type: e.type,
        prefabId: e.prefabId || null,
        position: { x: e.position.x, y: e.position.y, z: e.position.z },
        rotation: { x: e.rotation.x, y: e.rotation.y, z: e.rotation.z },
        scale:    { x: e.scale.x, y: e.scale.y, z: e.scale.z },
        tags: e.tags ? [...e.tags] : [],
      })),
    };
  }

  /** Deserialize from .novastar JSON */
  deserialize(data) {
    if (data.format !== 'novastar-project') {
      // Legacy v0.1/v0.2 format
      return { config: new ProjectConfig(), prefabs: new PrefabLibrary(), entities: data.entities || [] };
    }
    this.config = ProjectConfig.fromJSON(data.config);
    this.prefabs = PrefabLibrary.fromJSON(data.prefabs);
    this.history.clear();
    this._dirty = false;
    return { config: this.config, prefabs: this.prefabs, entities: data.entities || [] };
  }

  markDirty() { this._dirty = true; }
  get isDirty() { return this._dirty; }

  saveToRecent(name, template) {
    const entry = { name, template: template || 'custom', time: Date.now() };
    this._recent = [entry, ...this._recent.filter(r => r.name !== name)].slice(0, 10);
    try { localStorage.setItem('novastar_recent', JSON.stringify(this._recent)); } catch {}
  }

  get recentProjects() { return this._recent; }

  _loadRecent() {
    try { return JSON.parse(localStorage.getItem('novastar_recent') || '[]'); } catch { return []; }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────
let _counter = 0;
function _uid() { return `ns_${Date.now().toString(36)}_${(++_counter).toString(36)}`; }
