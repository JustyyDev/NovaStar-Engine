/**
 * NovaStar Tilemap System
 * Grid-based level builder for 2D, 2.5D, and 3D tile worlds
 */

import * as THREE from 'three';

export class Tilemap {
  constructor(engine, options = {}) {
    this.engine = engine;
    this.tileSize = options.tileSize || 1;
    this.width = options.width || 32;
    this.height = options.height || 32;
    this.layers = new Map();
    this.tileTypes = new Map();
    this.root = new THREE.Group();
    this.root.name = 'Tilemap';
    engine.scene.add(this.root);

    // Register built-in tile types
    this._registerDefaults();
  }

  // ─── TILE TYPE REGISTRATION ────────────────────
  /**
   * Register a tile type
   * @param {string} id - Unique identifier (e.g., 'grass', 'stone', 'water')
   * @param {object} definition
   *   - color: hex color
   *   - height: tile height in units (for 3D)
   *   - solid: whether this tile has collision
   *   - material: custom THREE.Material (optional)
   *   - mesh: custom mesh generator function (optional)
   *   - autoTile: auto-tiling rules (optional)
   */
  registerTile(id, definition) {
    this.tileTypes.set(id, {
      color: 0xcccccc,
      height: 0.5,
      solid: true,
      ...definition
    });
  }

  _registerDefaults() {
    this.registerTile('grass', { color: 0x66bb55, height: 0.5, topColor: 0x88dd66, solid: true });
    this.registerTile('stone', { color: 0x888888, height: 0.5, topColor: 0x999999, solid: true });
    this.registerTile('dirt', { color: 0x997755, height: 0.5, topColor: 0xaa8866, solid: true });
    this.registerTile('sand', { color: 0xddcc88, height: 0.3, topColor: 0xeedd99, solid: true });
    this.registerTile('water', { color: 0x4488cc, height: 0.1, solid: false, transparent: true, opacity: 0.7 });
    this.registerTile('lava', { color: 0xff4422, height: 0.1, solid: false, emissive: 0xff2200 });
    this.registerTile('ice', { color: 0xaaddff, height: 0.4, solid: true, friction: 0.1 });
    this.registerTile('wood', { color: 0xaa7744, height: 0.5, topColor: 0xbb8855, solid: true });
    this.registerTile('metal', { color: 0x667788, height: 0.5, solid: true, specular: true });
    this.registerTile('spike', { color: 0xdd4444, height: 0.3, solid: true, damage: true });
    this.registerTile('bounce', { color: 0xff88cc, height: 0.3, solid: true, bouncy: true });
    this.registerTile('empty', { color: null, height: 0, solid: false });
  }

  // ─── LAYER MANAGEMENT ──────────────────────────
  /**
   * Create a new layer
   */
  createLayer(name, zOffset = 0) {
    const layer = {
      name,
      zOffset,
      data: new Array(this.width * this.height).fill(null),
      meshGroup: new THREE.Group(),
      dirty: true,
    };
    layer.meshGroup.name = `Layer_${name}`;
    layer.meshGroup.position.y = zOffset;
    this.root.add(layer.meshGroup);
    this.layers.set(name, layer);
    return layer;
  }

  // ─── TILE OPERATIONS ───────────────────────────
  /**
   * Set a tile at grid position
   */
  setTile(layerName, x, z, tileId) {
    const layer = this.layers.get(layerName);
    if (!layer) return;
    if (x < 0 || x >= this.width || z < 0 || z >= this.height) return;
    layer.data[z * this.width + x] = tileId;
    layer.dirty = true;
  }

  /**
   * Get a tile at grid position
   */
  getTile(layerName, x, z) {
    const layer = this.layers.get(layerName);
    if (!layer || x < 0 || x >= this.width || z < 0 || z >= this.height) return null;
    return layer.data[z * this.width + x];
  }

  /**
   * Fill a rectangle with tiles
   */
  fillRect(layerName, x, z, w, h, tileId) {
    for (let iz = z; iz < z + h; iz++) {
      for (let ix = x; ix < x + w; ix++) {
        this.setTile(layerName, ix, iz, tileId);
      }
    }
  }

  /**
   * Clear all tiles in a layer
   */
  clearLayer(layerName) {
    const layer = this.layers.get(layerName);
    if (layer) {
      layer.data.fill(null);
      layer.dirty = true;
    }
  }

  // ─── BUILDING / MESH GENERATION ────────────────
  /**
   * Rebuild the visual mesh for a layer
   * Uses instanced meshes for performance
   */
  build(layerName) {
    const layer = this.layers.get(layerName);
    if (!layer) return;

    // Clear existing meshes
    while (layer.meshGroup.children.length > 0) {
      const child = layer.meshGroup.children[0];
      layer.meshGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }

    // Group tiles by type for instancing
    const tileGroups = new Map();
    for (let z = 0; z < this.height; z++) {
      for (let x = 0; x < this.width; x++) {
        const tileId = layer.data[z * this.width + x];
        if (!tileId || tileId === 'empty') continue;

        if (!tileGroups.has(tileId)) tileGroups.set(tileId, []);
        tileGroups.get(tileId).push({ x, z });
      }
    }

    // Create instanced meshes for each tile type
    for (const [tileId, positions] of tileGroups) {
      const tileDef = this.tileTypes.get(tileId);
      if (!tileDef || tileDef.color === null) continue;

      const ts = this.tileSize;
      const h = tileDef.height || 0.5;

      // Base geometry
      const geom = new THREE.BoxGeometry(ts * 0.98, h, ts * 0.98);

      // Material
      let mat;
      if (tileDef.material) {
        mat = tileDef.material;
      } else {
        const matOptions = { color: tileDef.color };
        if (tileDef.transparent) {
          matOptions.transparent = true;
          matOptions.opacity = tileDef.opacity || 0.7;
        }
        if (tileDef.emissive) {
          matOptions.emissive = new THREE.Color(tileDef.emissive);
          matOptions.emissiveIntensity = 0.5;
        }
        mat = this.engine.renderer.createCartoonMaterial(tileDef.color);
      }

      // Use InstancedMesh for performance
      const instMesh = new THREE.InstancedMesh(geom, mat, positions.length);
      instMesh.castShadow = true;
      instMesh.receiveShadow = true;

      const matrix = new THREE.Matrix4();
      positions.forEach((pos, i) => {
        matrix.setPosition(
          pos.x * ts + ts / 2,
          h / 2,
          pos.z * ts + ts / 2
        );
        instMesh.setMatrixAt(i, matrix);
      });
      instMesh.instanceMatrix.needsUpdate = true;

      layer.meshGroup.add(instMesh);

      // Top color layer
      if (tileDef.topColor) {
        const topGeom = new THREE.BoxGeometry(ts * 0.99, 0.06, ts * 0.99);
        const topMat = this.engine.renderer.createCartoonMaterial(tileDef.topColor);
        const topInst = new THREE.InstancedMesh(topGeom, topMat, positions.length);
        topInst.receiveShadow = true;

        positions.forEach((pos, i) => {
          matrix.setPosition(pos.x * ts + ts / 2, h, pos.z * ts + ts / 2);
          topInst.setMatrixAt(i, matrix);
        });
        topInst.instanceMatrix.needsUpdate = true;
        layer.meshGroup.add(topInst);
      }
    }

    layer.dirty = false;
  }

  /**
   * Build all dirty layers
   */
  buildAll() {
    for (const [name, layer] of this.layers) {
      if (layer.dirty) this.build(name);
    }
  }

  // ─── PHYSICS GENERATION ────────────────────────
  /**
   * Generate physics bodies for solid tiles in a layer
   */
  generateColliders(layerName) {
    const layer = this.layers.get(layerName);
    if (!layer) return [];

    const bodies = [];
    const ts = this.tileSize;

    // Simple: one body per tile (could be optimized with greedy meshing)
    for (let z = 0; z < this.height; z++) {
      for (let x = 0; x < this.width; x++) {
        const tileId = layer.data[z * this.width + x];
        if (!tileId) continue;

        const tileDef = this.tileTypes.get(tileId);
        if (!tileDef || !tileDef.solid) continue;

        const h = tileDef.height || 0.5;
        const body = this.engine.physics.createBody({
          position: new THREE.Vector3(
            x * ts + ts / 2,
            layer.zOffset + h / 2,
            z * ts + ts / 2
          ),
          halfExtents: new THREE.Vector3(ts / 2, h / 2, ts / 2),
          isStatic: true,
          tag: tileId,
          isTrigger: !!tileDef.damage,
        });

        if (tileDef.bouncy) {
          body.bounciness = 1.5;
        }

        bodies.push(body);
      }
    }

    return bodies;
  }

  // ─── WORLD <-> GRID CONVERSION ─────────────────
  worldToGrid(worldX, worldZ) {
    return {
      x: Math.floor(worldX / this.tileSize),
      z: Math.floor(worldZ / this.tileSize),
    };
  }

  gridToWorld(gridX, gridZ) {
    return {
      x: gridX * this.tileSize + this.tileSize / 2,
      z: gridZ * this.tileSize + this.tileSize / 2,
    };
  }

  // ─── IMPORT / EXPORT ───────────────────────────
  toJSON() {
    const data = {
      tileSize: this.tileSize,
      width: this.width,
      height: this.height,
      layers: {}
    };
    for (const [name, layer] of this.layers) {
      data.layers[name] = {
        zOffset: layer.zOffset,
        data: layer.data,
      };
    }
    return data;
  }

  fromJSON(data) {
    this.tileSize = data.tileSize;
    this.width = data.width;
    this.height = data.height;

    for (const [name, layerData] of Object.entries(data.layers)) {
      const layer = this.createLayer(name, layerData.zOffset);
      layer.data = layerData.data;
      layer.dirty = true;
    }
    this.buildAll();
  }

  /**
   * Load from a 2D array (simple level format)
   * @param {string} layerName
   * @param {string[][]} grid - 2D array of tile IDs
   */
  fromGrid(layerName, grid) {
    if (!this.layers.has(layerName)) {
      this.createLayer(layerName);
    }
    this.height = grid.length;
    this.width = Math.max(...grid.map(row => row.length));

    const layer = this.layers.get(layerName);
    layer.data = new Array(this.width * this.height).fill(null);

    for (let z = 0; z < grid.length; z++) {
      for (let x = 0; x < grid[z].length; x++) {
        if (grid[z][x]) {
          layer.data[z * this.width + x] = grid[z][x];
        }
      }
    }
    layer.dirty = true;
  }

  // ─── CLEANUP ───────────────────────────────────
  destroy() {
    this.engine.scene.remove(this.root);
    this.root.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
    this.layers.clear();
  }
}
