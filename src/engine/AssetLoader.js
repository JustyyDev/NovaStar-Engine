/**
 * NovaStar Asset Loader
 * Load GLTF/GLB models, textures, audio, JSON, and manage a resource cache
 */

import * as THREE from 'three';

// Minimal GLTF loader (no external dependency)
class SimpleGLTFLoader {
  constructor() {
    this.dracoLoader = null;
  }

  async load(url) {
    const response = await fetch(url);
    const isGLB = url.endsWith('.glb');

    if (isGLB) {
      const buffer = await response.arrayBuffer();
      return this._parseGLB(buffer);
    } else {
      const json = await response.json();
      return this._parseGLTF(json, url);
    }
  }

  _parseGLB(buffer) {
    const view = new DataView(buffer);
    // GLB header
    const magic = view.getUint32(0, true);
    if (magic !== 0x46546C67) throw new Error('Invalid GLB file');

    const version = view.getUint32(4, true);
    const length = view.getUint32(8, true);

    // Chunk 0 = JSON
    const jsonLength = view.getUint32(12, true);
    const jsonType = view.getUint32(16, true);
    const jsonData = new Uint8Array(buffer, 20, jsonLength);
    const jsonText = new TextDecoder().decode(jsonData);
    const json = JSON.parse(jsonText);

    // Chunk 1 = BIN (optional)
    let binData = null;
    if (20 + jsonLength < length) {
      const binOffset = 20 + jsonLength;
      const binLength = view.getUint32(binOffset, true);
      binData = new Uint8Array(buffer, binOffset + 8, binLength);
    }

    return this._buildScene(json, binData);
  }

  async _parseGLTF(json, baseUrl) {
    const dir = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);

    // Load buffers
    let binData = null;
    if (json.buffers && json.buffers.length > 0) {
      const bufferUri = json.buffers[0].uri;
      if (bufferUri) {
        const resp = await fetch(dir + bufferUri);
        binData = new Uint8Array(await resp.arrayBuffer());
      }
    }

    return this._buildScene(json, binData);
  }

  _buildScene(json, binData) {
    const scene = new THREE.Group();
    scene.name = 'GLTFScene';

    if (!json.meshes || !json.accessors || !binData) {
      return { scene, animations: [], cameras: [] };
    }

    // Parse buffer views
    const bufferViews = (json.bufferViews || []).map(bv => ({
      data: new Uint8Array(binData.buffer, binData.byteOffset + (bv.byteOffset || 0), bv.byteLength),
      byteStride: bv.byteStride || 0,
    }));

    // Parse accessors
    const accessors = (json.accessors || []).map(acc => {
      const bv = bufferViews[acc.bufferView];
      const componentSize = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[acc.componentType] || 4;
      const typeCount = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[acc.type] || 1;
      const offset = acc.byteOffset || 0;

      let TypedArray;
      switch (acc.componentType) {
        case 5126: TypedArray = Float32Array; break;
        case 5123: TypedArray = Uint16Array; break;
        case 5125: TypedArray = Uint32Array; break;
        case 5121: TypedArray = Uint8Array; break;
        default: TypedArray = Float32Array;
      }

      const data = new TypedArray(bv.data.buffer, bv.data.byteOffset + offset, acc.count * typeCount);
      return { data, count: acc.count, type: acc.type, componentType: acc.componentType };
    });

    // Parse materials
    const materials = (json.materials || []).map(mat => {
      const pbr = mat.pbrMetallicRoughness || {};
      const color = pbr.baseColorFactor || [1, 1, 1, 1];
      return new THREE.MeshToonMaterial({
        color: new THREE.Color(color[0], color[1], color[2]),
        transparent: color[3] < 1,
        opacity: color[3],
      });
    });

    // Default material
    const defaultMat = new THREE.MeshToonMaterial({ color: 0xcccccc });

    // Parse meshes
    const meshes = (json.meshes || []).map(meshDef => {
      const group = new THREE.Group();
      group.name = meshDef.name || 'Mesh';

      for (const prim of meshDef.primitives) {
        const geom = new THREE.BufferGeometry();

        // Position
        if (prim.attributes.POSITION !== undefined) {
          const acc = accessors[prim.attributes.POSITION];
          geom.setAttribute('position', new THREE.BufferAttribute(acc.data, 3));
        }

        // Normal
        if (prim.attributes.NORMAL !== undefined) {
          const acc = accessors[prim.attributes.NORMAL];
          geom.setAttribute('normal', new THREE.BufferAttribute(acc.data, 3));
        } else {
          geom.computeVertexNormals();
        }

        // UV
        if (prim.attributes.TEXCOORD_0 !== undefined) {
          const acc = accessors[prim.attributes.TEXCOORD_0];
          geom.setAttribute('uv', new THREE.BufferAttribute(acc.data, 2));
        }

        // Indices
        if (prim.indices !== undefined) {
          const acc = accessors[prim.indices];
          geom.setIndex(new THREE.BufferAttribute(acc.data, 1));
        }

        const mat = prim.material !== undefined ? materials[prim.material] : defaultMat;
        const mesh = new THREE.Mesh(geom, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
      }

      return group;
    });

    // Parse nodes and build hierarchy
    const nodes = (json.nodes || []).map((nodeDef, i) => {
      let node;
      if (nodeDef.mesh !== undefined) {
        node = meshes[nodeDef.mesh].clone();
      } else {
        node = new THREE.Group();
      }
      node.name = nodeDef.name || `Node_${i}`;

      if (nodeDef.translation) node.position.fromArray(nodeDef.translation);
      if (nodeDef.rotation) node.quaternion.fromArray(nodeDef.rotation);
      if (nodeDef.scale) node.scale.fromArray(nodeDef.scale);

      return node;
    });

    // Set up parent-child relationships
    (json.nodes || []).forEach((nodeDef, i) => {
      if (nodeDef.children) {
        for (const childIdx of nodeDef.children) {
          nodes[i].add(nodes[childIdx]);
        }
      }
    });

    // Add root nodes to scene
    const sceneIdx = json.scene || 0;
    const sceneDef = json.scenes?.[sceneIdx];
    if (sceneDef && sceneDef.nodes) {
      for (const nodeIdx of sceneDef.nodes) {
        scene.add(nodes[nodeIdx]);
      }
    } else {
      // Add all parentless nodes
      nodes.forEach(node => {
        if (!node.parent || node.parent.type === 'Scene') {
          scene.add(node);
        }
      });
    }

    return { scene, animations: [], cameras: [], nodes };
  }
}


export class AssetLoader {
  constructor(engine) {
    this.engine = engine;
    this._cache = new Map();
    this._loading = new Map();
    this._gltfLoader = new SimpleGLTFLoader();
    this._textureLoader = new THREE.TextureLoader();
  }

  /**
   * Load a GLTF/GLB 3D model
   * @returns {Promise<{scene, animations, cameras}>}
   */
  async loadModel(url, options = {}) {
    const cached = this._getFromCache(url);
    if (cached) return cached.scene.clone();

    const result = await this._gltfLoader.load(url);

    // Apply toon materials if requested
    if (options.toon !== false) {
      result.scene.traverse(child => {
        if (child.isMesh && child.material) {
          const color = child.material.color?.clone() || new THREE.Color(0xcccccc);
          child.material = this.engine.renderer.createCartoonMaterial(color);
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }

    // Scale
    if (options.scale) {
      const s = typeof options.scale === 'number' ? options.scale : 1;
      result.scene.scale.setScalar(s);
    }

    this._cache.set(url, result);
    return result.scene.clone();
  }

  /**
   * Load a texture
   * @returns {Promise<THREE.Texture>}
   */
  async loadTexture(url, options = {}) {
    const cached = this._getFromCache(url);
    if (cached) return cached;

    return new Promise((resolve, reject) => {
      this._textureLoader.load(url,
        (texture) => {
          if (options.nearest) {
            texture.minFilter = THREE.NearestFilter;
            texture.magFilter = THREE.NearestFilter;
          }
          if (options.repeat) {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
          }
          this._cache.set(url, texture);
          resolve(texture);
        },
        undefined,
        reject
      );
    });
  }

  /**
   * Load a JSON file
   */
  async loadJSON(url) {
    const cached = this._getFromCache(url);
    if (cached) return cached;

    const response = await fetch(url);
    const data = await response.json();
    this._cache.set(url, data);
    return data;
  }

  /**
   * Load a text file (e.g., .nova scripts)
   */
  async loadText(url) {
    const cached = this._getFromCache(url);
    if (cached) return cached;

    const response = await fetch(url);
    const text = await response.text();
    this._cache.set(url, text);
    return text;
  }

  /**
   * Load an audio buffer
   */
  async loadAudio(url) {
    const cached = this._getFromCache(url);
    if (cached) return cached;

    if (!this.engine.audio.ctx) this.engine.audio.init();

    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.engine.audio.ctx.decodeAudioData(arrayBuffer);
    this._cache.set(url, audioBuffer);
    return audioBuffer;
  }

  /**
   * Preload multiple assets at once with progress callback
   */
  async preload(assets, onProgress = null) {
    let loaded = 0;
    const total = assets.length;
    const results = {};

    const promises = assets.map(async (asset) => {
      const { name, url, type } = asset;
      let result;

      switch (type) {
        case 'model':  result = await this.loadModel(url, asset.options); break;
        case 'texture': result = await this.loadTexture(url, asset.options); break;
        case 'json':   result = await this.loadJSON(url); break;
        case 'text':   result = await this.loadText(url); break;
        case 'audio':  result = await this.loadAudio(url); break;
        default: throw new Error(`Unknown asset type: ${type}`);
      }

      loaded++;
      results[name] = result;
      if (onProgress) onProgress(loaded, total, name);
      return result;
    });

    await Promise.all(promises);
    return results;
  }

  _getFromCache(key) {
    return this._cache.get(key) || null;
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this._cache.clear();
  }

  /**
   * Get cache stats
   */
  get cacheSize() {
    return this._cache.size;
  }
}
