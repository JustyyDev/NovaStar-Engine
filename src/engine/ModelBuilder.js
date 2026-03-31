/**
 * NovaStar Model Builder v0.3
 * Built-in 3D modeler for creating low-poly models from primitives.
 * 
 * Lets you combine boxes, spheres, cylinders, cones, toruses, and planes
 * into custom models. Each part can be moved, rotated, scaled, and colored
 * independently. Finished models can be saved as prefabs.
 *
 * Works both from the editor UI (Modeler tab) and from code.
 */

import * as THREE from 'three';

// Each model is a collection of parts
class ModelPart {
  constructor(data = {}) {
    this.id = data.id || _uid();
    this.name = data.name || 'Part';
    this.type = data.type || 'box'; // box, sphere, cylinder, cone, torus, plane
    this.color = data.color || '#4da8ff';
    this.position = data.position || { x: 0, y: 0, z: 0 };
    this.rotation = data.rotation || { x: 0, y: 0, z: 0 };
    this.scale = data.scale || { x: 1, y: 1, z: 1 };
    this.params = data.params || this._defaultParams();
    this.visible = data.visible !== false;
    this.castShadow = data.castShadow !== false;
    this.mesh = null; // live THREE.Mesh reference (not serialized)
  }

  _defaultParams() {
    switch (this.type) {
      case 'box': return { width: 1, height: 1, depth: 1 };
      case 'sphere': return { radius: 0.5, widthSegments: 8, heightSegments: 6 };
      case 'cylinder': return { radiusTop: 0.5, radiusBottom: 0.5, height: 1, segments: 8 };
      case 'cone': return { radius: 0.5, height: 1, segments: 8 };
      case 'torus': return { radius: 0.5, tube: 0.15, radialSegments: 8, tubularSegments: 16 };
      case 'plane': return { width: 1, height: 1 };
      default: return {};
    }
  }

  createGeometry() {
    const p = this.params;
    switch (this.type) {
      case 'box':
        return new THREE.BoxGeometry(p.width || 1, p.height || 1, p.depth || 1);
      case 'sphere':
        return new THREE.SphereGeometry(p.radius || 0.5, p.widthSegments || 8, p.heightSegments || 6);
      case 'cylinder':
        return new THREE.CylinderGeometry(p.radiusTop || 0.5, p.radiusBottom || 0.5, p.height || 1, p.segments || 8);
      case 'cone':
        return new THREE.ConeGeometry(p.radius || 0.5, p.height || 1, p.segments || 8);
      case 'torus':
        return new THREE.TorusGeometry(p.radius || 0.5, p.tube || 0.15, p.radialSegments || 8, p.tubularSegments || 16);
      case 'plane':
        return new THREE.PlaneGeometry(p.width || 1, p.height || 1);
      default:
        return new THREE.BoxGeometry(1, 1, 1);
    }
  }

  toJSON() {
    return {
      id: this.id, name: this.name, type: this.type, color: this.color,
      position: { ...this.position }, rotation: { ...this.rotation }, scale: { ...this.scale },
      params: { ...this.params }, visible: this.visible, castShadow: this.castShadow,
    };
  }

  static fromJSON(data) {
    return new ModelPart(data);
  }
}

// A model is a named group of parts
class Model {
  constructor(data = {}) {
    this.id = data.id || _uid();
    this.name = data.name || 'New Model';
    this.parts = [];
    this.group = new THREE.Group();
    this.group.name = 'Model_' + this.name;
    this.createdAt = data.createdAt || Date.now();
    this.modifiedAt = Date.now();

    // Rebuild from saved parts
    if (data.parts) {
      data.parts.forEach(pd => {
        const part = ModelPart.fromJSON(pd);
        this.parts.push(part);
      });
    }
  }

  toJSON() {
    return {
      id: this.id, name: this.name,
      parts: this.parts.map(p => p.toJSON()),
      createdAt: this.createdAt, modifiedAt: Date.now(),
    };
  }

  static fromJSON(data) {
    return new Model(data);
  }
}

/**
 * ModelBuilder - the main modeler class.
 * Manages model creation, part manipulation, and prefab conversion.
 */
export class ModelBuilder {
  constructor(engine) {
    this.engine = engine;
    this.models = new Map();
    this.activeModel = null;
    this.selectedPart = null;
    this._listeners = [];
    this._partHelper = null; // selection highlight for the active part
  }

  // ── Model Lifecycle ──────────────────────────────

  /** Create a new empty model */
  create(name = 'New Model') {
    const model = new Model({ name });
    this.models.set(model.id, model);
    this.activeModel = model;
    this._emit('create', model);
    return model;
  }

  /** Get a model by id */
  get(id) { return this.models.get(id); }

  /** Get all models */
  getAll() { return [...this.models.values()]; }

  /** Delete a model and clean up its meshes */
  delete(id) {
    const model = this.models.get(id);
    if (!model) return;
    this._cleanupModelMeshes(model);
    this.models.delete(id);
    if (this.activeModel === model) this.activeModel = null;
    this._emit('delete', model);
  }

  /** Set the active model being edited */
  setActive(id) {
    this.activeModel = this.models.get(id) || null;
    this.selectedPart = null;
    this._emit('activeChange', this.activeModel);
  }

  /** Rename a model */
  rename(id, newName) {
    const model = this.models.get(id);
    if (model) {
      model.name = newName;
      model.group.name = 'Model_' + newName;
      this._emit('rename', model);
    }
  }

  // ── Part Operations ──────────────────────────────

  /**
   * Add a primitive part to the active model
   * @param {Model|string} modelOrId - model instance or id
   * @param {string} type - 'box', 'sphere', 'cylinder', 'cone', 'torus', 'plane'
   * @param {object} options - { color, position, rotation, scale, params, name }
   * @returns {ModelPart}
   */
  addPrimitive(modelOrId, type, options = {}) {
    const model = typeof modelOrId === 'string' ? this.models.get(modelOrId) : modelOrId;
    if (!model) return null;

    const part = new ModelPart({
      type,
      name: options.name || (type.charAt(0).toUpperCase() + type.slice(1) + '_' + (model.parts.length + 1)),
      color: options.color || this._nextColor(model.parts.length),
      position: options.position || { x: 0, y: 0, z: 0 },
      rotation: options.rotation || { x: 0, y: 0, z: 0 },
      scale: options.scale || { x: 1, y: 1, z: 1 },
      params: options.params || undefined,
    });

    // Override default params with any provided size shortcuts
    if (options.size) {
      if (type === 'box') {
        part.params.width = options.size.x || 1;
        part.params.height = options.size.y || 1;
        part.params.depth = options.size.z || 1;
      } else if (type === 'sphere') {
        part.params.radius = options.size.x || 0.5;
      } else if (type === 'cylinder') {
        part.params.radiusTop = (options.size.x || 1) / 2;
        part.params.radiusBottom = (options.size.x || 1) / 2;
        part.params.height = options.size.y || 1;
      } else if (type === 'cone') {
        part.params.radius = (options.size.x || 1) / 2;
        part.params.height = options.size.y || 1;
      }
    }

    if (options.radius !== undefined) part.params.radius = options.radius;
    if (options.height !== undefined) part.params.height = options.height;
    if (options.segments !== undefined) {
      part.params.segments = options.segments;
      part.params.widthSegments = options.segments;
      part.params.radialSegments = options.segments;
    }

    // Build the mesh
    this._buildPartMesh(model, part);
    model.parts.push(part);
    model.modifiedAt = Date.now();
    this._emit('partAdd', { model, part });
    return part;
  }

  /** Remove a part from a model */
  removePart(modelOrId, partId) {
    const model = typeof modelOrId === 'string' ? this.models.get(modelOrId) : modelOrId;
    if (!model) return;

    const idx = model.parts.findIndex(p => p.id === partId);
    if (idx === -1) return;

    const part = model.parts[idx];
    if (part.mesh) {
      model.group.remove(part.mesh);
      part.mesh.geometry?.dispose();
      part.mesh.material?.dispose();
    }
    model.parts.splice(idx, 1);
    if (this.selectedPart === part) this.selectedPart = null;
    model.modifiedAt = Date.now();
    this._emit('partRemove', { model, part });
  }

  /** Duplicate a part */
  duplicatePart(modelOrId, partId) {
    const model = typeof modelOrId === 'string' ? this.models.get(modelOrId) : modelOrId;
    if (!model) return null;

    const source = model.parts.find(p => p.id === partId);
    if (!source) return null;

    return this.addPrimitive(model, source.type, {
      name: source.name + '_copy',
      color: source.color,
      position: { x: source.position.x + 0.5, y: source.position.y, z: source.position.z },
      rotation: { ...source.rotation },
      scale: { ...source.scale },
      params: { ...source.params },
    });
  }

  /** Update a part's transform */
  setPartTransform(part, transform) {
    if (transform.position) Object.assign(part.position, transform.position);
    if (transform.rotation) Object.assign(part.rotation, transform.rotation);
    if (transform.scale) Object.assign(part.scale, transform.scale);

    if (part.mesh) {
      part.mesh.position.set(part.position.x, part.position.y, part.position.z);
      part.mesh.rotation.set(
        THREE.MathUtils.degToRad(part.rotation.x),
        THREE.MathUtils.degToRad(part.rotation.y),
        THREE.MathUtils.degToRad(part.rotation.z)
      );
      part.mesh.scale.set(part.scale.x, part.scale.y, part.scale.z);
    }
    this._emit('partUpdate', part);
  }

  /** Update a part's color */
  setPartColor(part, color) {
    part.color = color;
    if (part.mesh && part.mesh.material) {
      part.mesh.material.color.set(color);
    }
    this._emit('partUpdate', part);
  }

  /** Update a part's geometry parameters and rebuild */
  setPartParams(model, part, newParams) {
    Object.assign(part.params, newParams);
    // Rebuild geometry
    if (part.mesh) {
      part.mesh.geometry?.dispose();
      part.mesh.geometry = part.createGeometry();
    }
    model.modifiedAt = Date.now();
    this._emit('partUpdate', part);
  }

  /** Select a part for editing */
  selectPart(part) {
    this.selectedPart = part;
    this._updatePartHighlight();
    this._emit('partSelect', part);
  }

  // ── Merge / Flatten ──────────────────────────────

  /**
   * Merge all parts into a single mesh (flattens the model).
   * Creates a new merged geometry. The original parts are kept for editing,
   * but you can use the merged mesh for better performance in-game.
   */
  mergeParts(modelOrId) {
    const model = typeof modelOrId === 'string' ? this.models.get(modelOrId) : modelOrId;
    if (!model || model.parts.length === 0) return null;

    const mergedGroup = new THREE.Group();
    mergedGroup.name = 'Merged_' + model.name;

    for (const part of model.parts) {
      if (!part.visible) continue;
      const geom = part.createGeometry();
      const mat = this.engine.renderer.createCartoonMaterial(
        typeof part.color === 'string' ? parseInt(part.color.replace('#', '0x')) : part.color
      );
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(part.position.x, part.position.y, part.position.z);
      mesh.rotation.set(
        THREE.MathUtils.degToRad(part.rotation.x),
        THREE.MathUtils.degToRad(part.rotation.y),
        THREE.MathUtils.degToRad(part.rotation.z)
      );
      mesh.scale.set(part.scale.x, part.scale.y, part.scale.z);
      mesh.castShadow = part.castShadow;
      mesh.receiveShadow = true;
      mergedGroup.add(mesh);
    }

    return mergedGroup;
  }

  // ── Scene Integration ────────────────────────────

  /** Add the active model's group to the scene for preview */
  showInScene(model) {
    const m = model || this.activeModel;
    if (!m) return;
    if (!m.group.parent) {
      this.engine.scene.add(m.group);
    }
  }

  /** Remove a model from the scene */
  hideFromScene(model) {
    const m = model || this.activeModel;
    if (!m) return;
    this.engine.scene.remove(m.group);
  }

  /**
   * Convert a model to a prefab.
   * The prefab stores the model data in its components so it can
   * be reconstructed and spawned as a game entity.
   */
  toPrefab(modelOrId, prefabName) {
    const model = typeof modelOrId === 'string' ? this.models.get(modelOrId) : modelOrId;
    if (!model) return null;

    return {
      name: prefabName || model.name,
      category: 'custom-model',
      components: [
        {
          type: 'CustomModel',
          modelId: model.id,
          modelName: model.name,
          parts: model.parts.map(p => p.toJSON()),
        },
      ],
      tags: ['custom-model'],
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      },
    };
  }

  /**
   * Spawn a model into the scene as a game entity mesh group.
   * Returns a THREE.Group ready to be added to the engine.
   */
  spawnModel(modelOrId, position = { x: 0, y: 0, z: 0 }) {
    const merged = this.mergeParts(modelOrId);
    if (merged) {
      merged.position.set(position.x, position.y, position.z);
      this.engine.scene.add(merged);
    }
    return merged;
  }

  // ── Import / Export ──────────────────────────────

  /** Export all models as JSON */
  exportAll() {
    return [...this.models.values()].map(m => m.toJSON());
  }

  /** Import models from JSON */
  importAll(arr) {
    for (const data of arr) {
      const model = Model.fromJSON(data);
      // Rebuild all part meshes
      for (const part of model.parts) {
        this._buildPartMesh(model, part);
      }
      this.models.set(model.id, model);
    }
    this._emit('import', this.getAll());
  }

  /** Export a single model as a downloadable JSON file */
  exportModel(modelOrId) {
    const model = typeof modelOrId === 'string' ? this.models.get(modelOrId) : modelOrId;
    if (!model) return;
    const json = JSON.stringify(model.toJSON(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = model.name.replace(/\s+/g, '_') + '.novamodel';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /** Import a model from a .novamodel file */
  async importModel(file) {
    const text = await file.text();
    const data = JSON.parse(text);
    const model = Model.fromJSON(data);
    for (const part of model.parts) {
      this._buildPartMesh(model, part);
    }
    this.models.set(model.id, model);
    this._emit('import', [model]);
    return model;
  }

  // ── Internal Helpers ─────────────────────────────

  _buildPartMesh(model, part) {
    const geom = part.createGeometry();
    const colorVal = typeof part.color === 'string' ? parseInt(part.color.replace('#', ''), 16) : part.color;
    const mat = this.engine.renderer.createCartoonMaterial(colorVal);
    const mesh = new THREE.Mesh(geom, mat);

    mesh.position.set(part.position.x, part.position.y, part.position.z);
    mesh.rotation.set(
      THREE.MathUtils.degToRad(part.rotation.x),
      THREE.MathUtils.degToRad(part.rotation.y),
      THREE.MathUtils.degToRad(part.rotation.z)
    );
    mesh.scale.set(part.scale.x, part.scale.y, part.scale.z);
    mesh.castShadow = part.castShadow;
    mesh.receiveShadow = true;
    mesh.userData._modelPart = part;

    part.mesh = mesh;
    model.group.add(mesh);
  }

  _cleanupModelMeshes(model) {
    for (const part of model.parts) {
      if (part.mesh) {
        model.group.remove(part.mesh);
        part.mesh.geometry?.dispose();
        part.mesh.material?.dispose();
        part.mesh = null;
      }
    }
    if (model.group.parent) {
      model.group.parent.remove(model.group);
    }
  }

  _updatePartHighlight() {
    // Remove old highlight
    if (this._partHelper) {
      this._partHelper.parent?.remove(this._partHelper);
      this._partHelper = null;
    }
    // Add new highlight around selected part
    if (this.selectedPart && this.selectedPart.mesh) {
      this._partHelper = new THREE.BoxHelper(this.selectedPart.mesh, 0xa86bff);
      this.selectedPart.mesh.parent?.add(this._partHelper);
    }
  }

  /** Cycle through nice colors for new parts */
  _nextColor(index) {
    const palette = [
      '#4da8ff', '#4ee6a0', '#a86bff', '#ffa64d', '#ff5568',
      '#ffe066', '#88ddff', '#ff88cc', '#66bb55', '#cc8844',
    ];
    return palette[index % palette.length];
  }

  onChange(fn) { this._listeners.push(fn); return () => { this._listeners = this._listeners.filter(f => f !== fn); }; }
  _emit(type, data) { this._listeners.forEach(fn => fn(type, data)); }

  // ── Presets (quick model templates) ──────────────

  /** Create a simple house model */
  presetHouse(name = 'House') {
    const m = this.create(name);
    this.addPrimitive(m, 'box', { name: 'Walls', color: '#cc8844', size: { x: 2, y: 1.5, z: 2 }, position: { x: 0, y: 0.75, z: 0 } });
    this.addPrimitive(m, 'cone', { name: 'Roof', color: '#dd4444', radius: 1.5, height: 1.2, segments: 4, position: { x: 0, y: 2.1, z: 0 } });
    this.addPrimitive(m, 'box', { name: 'Door', color: '#8b5533', size: { x: 0.5, y: 0.8, z: 0.1 }, position: { x: 0, y: 0.4, z: 1.01 } });
    this.addPrimitive(m, 'box', { name: 'Window_L', color: '#88ddff', size: { x: 0.35, y: 0.35, z: 0.1 }, position: { x: -0.55, y: 1.0, z: 1.01 } });
    this.addPrimitive(m, 'box', { name: 'Window_R', color: '#88ddff', size: { x: 0.35, y: 0.35, z: 0.1 }, position: { x: 0.55, y: 1.0, z: 1.01 } });
    return m;
  }

  /** Create a tree model */
  presetTree(name = 'Custom Tree') {
    const m = this.create(name);
    this.addPrimitive(m, 'cylinder', { name: 'Trunk', color: '#8b7355', params: { radiusTop: 0.15, radiusBottom: 0.2, height: 1.5, segments: 6 }, position: { x: 0, y: 0.75, z: 0 } });
    this.addPrimitive(m, 'sphere', { name: 'Leaves_Bottom', color: '#3cb043', params: { radius: 0.8, widthSegments: 6, heightSegments: 5 }, position: { x: 0, y: 1.8, z: 0 } });
    this.addPrimitive(m, 'sphere', { name: 'Leaves_Top', color: '#4ee6a0', params: { radius: 0.55, widthSegments: 6, heightSegments: 5 }, position: { x: 0, y: 2.5, z: 0 } });
    return m;
  }

  /** Create a vehicle/cart model */
  presetVehicle(name = 'Vehicle') {
    const m = this.create(name);
    this.addPrimitive(m, 'box', { name: 'Body', color: '#4da8ff', size: { x: 2, y: 0.6, z: 1 }, position: { x: 0, y: 0.5, z: 0 } });
    this.addPrimitive(m, 'box', { name: 'Cabin', color: '#3388dd', size: { x: 0.9, y: 0.5, z: 0.9 }, position: { x: -0.2, y: 1.05, z: 0 } });
    this.addPrimitive(m, 'box', { name: 'Windshield', color: '#88ddff', size: { x: 0.05, y: 0.35, z: 0.7 }, position: { x: 0.25, y: 1.0, z: 0 } });
    // wheels
    [[-0.6, -0.55], [-0.6, 0.55], [0.6, -0.55], [0.6, 0.55]].forEach(([wx, wz], i) => {
      this.addPrimitive(m, 'cylinder', { name: 'Wheel_' + (i + 1), color: '#333333', params: { radiusTop: 0.2, radiusBottom: 0.2, height: 0.15, segments: 8 }, position: { x: wx, y: 0.2, z: wz }, rotation: { x: 90, y: 0, z: 0 } });
    });
    return m;
  }

  /** Create a sword/weapon model */
  presetSword(name = 'Sword') {
    const m = this.create(name);
    this.addPrimitive(m, 'box', { name: 'Blade', color: '#c0c0c0', size: { x: 0.12, y: 1.8, z: 0.04 }, position: { x: 0, y: 1.3, z: 0 } });
    this.addPrimitive(m, 'box', { name: 'Guard', color: '#8b7355', size: { x: 0.5, y: 0.1, z: 0.12 }, position: { x: 0, y: 0.4, z: 0 } });
    this.addPrimitive(m, 'cylinder', { name: 'Handle', color: '#664422', params: { radiusTop: 0.06, radiusBottom: 0.07, height: 0.35, segments: 6 }, position: { x: 0, y: 0.17, z: 0 } });
    this.addPrimitive(m, 'sphere', { name: 'Pommel', color: '#ffa64d', params: { radius: 0.08, widthSegments: 6, heightSegments: 4 }, position: { x: 0, y: -0.02, z: 0 } });
    return m;
  }

  /** Create a gem/crystal model */
  presetGem(name = 'Gem') {
    const m = this.create(name);
    this.addPrimitive(m, 'cone', { name: 'Top', color: '#a86bff', radius: 0.4, height: 0.5, segments: 6, position: { x: 0, y: 0.25, z: 0 } });
    this.addPrimitive(m, 'cone', { name: 'Bottom', color: '#7744cc', radius: 0.4, height: 0.3, segments: 6, position: { x: 0, y: -0.15, z: 0 }, rotation: { x: 180, y: 0, z: 0 } });
    return m;
  }
}

// ── Helpers ──────────────────────────────────────
let _counter = 0;
function _uid() { return 'mp_' + Date.now().toString(36) + '_' + (++_counter).toString(36); }

export { Model, ModelPart };
