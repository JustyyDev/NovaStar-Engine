/**
 * NovaStar Material System v0.4.1
 * Unified material creation supporting multiple rendering styles:
 * - PBR (Physically Based Rendering) for realistic games
 * - Toon/Cel-shaded for cartoony games  
 * - Unlit for UI elements, retro styles, or performance
 * - Custom shader materials
 */

import * as THREE from 'three';

// ─── Material Presets ─────────────────────────────────────
export const MaterialPresets = {
  // PBR presets
  'pbr-metal': { type: 'pbr', color: '#888888', metalness: 1.0, roughness: 0.3 },
  'pbr-plastic': { type: 'pbr', color: '#cc4444', metalness: 0.0, roughness: 0.5 },
  'pbr-wood': { type: 'pbr', color: '#8B6914', metalness: 0.0, roughness: 0.8 },
  'pbr-glass': { type: 'pbr', color: '#aaddff', metalness: 0.1, roughness: 0.05, opacity: 0.3, transparent: true },
  'pbr-stone': { type: 'pbr', color: '#888880', metalness: 0.0, roughness: 0.95 },
  'pbr-gold': { type: 'pbr', color: '#FFD700', metalness: 1.0, roughness: 0.2 },
  'pbr-rubber': { type: 'pbr', color: '#333333', metalness: 0.0, roughness: 0.9 },
  'pbr-ceramic': { type: 'pbr', color: '#f5f5f0', metalness: 0.0, roughness: 0.15 },
  'pbr-fabric': { type: 'pbr', color: '#4466aa', metalness: 0.0, roughness: 1.0 },
  'pbr-ice': { type: 'pbr', color: '#ccf0ff', metalness: 0.1, roughness: 0.05, opacity: 0.7, transparent: true },

  // Toon presets
  'toon-default': { type: 'toon', color: '#66bb55', steps: 3 },
  'toon-bright': { type: 'toon', color: '#ff6644', steps: 2 },
  'toon-soft': { type: 'toon', color: '#88aadd', steps: 5 },
  'toon-flat': { type: 'toon', color: '#ffcc44', steps: 1 },

  // Unlit presets
  'unlit-white': { type: 'unlit', color: '#ffffff' },
  'unlit-emissive': { type: 'unlit', color: '#44ffaa', emissive: '#44ffaa', emissiveIntensity: 0.5 },
  'unlit-wireframe': { type: 'unlit', color: '#4da8ff', wireframe: true },
};

// ─── Material System ──────────────────────────────────────
export class MaterialSystem {
  constructor(engine) {
    this.engine = engine;
    this._textureLoader = new THREE.TextureLoader();
    this._textureCache = new Map();
    this._materialCache = new Map();
    this._envMap = null;
  }

  /**
   * Create a material from a config object
   * @param {object} config - { type, color, metalness, roughness, ... }
   * @returns {THREE.Material}
   */
  create(config = {}) {
    const type = config.type || 'toon';
    switch (type) {
      case 'pbr': return this.createPBR(config);
      case 'toon': return this.createToon(config);
      case 'unlit': return this.createUnlit(config);
      case 'custom': return this.createCustomShader(config);
      default: return this.createToon(config);
    }
  }

  /**
   * Create from a preset name
   */
  fromPreset(presetName) {
    const preset = MaterialPresets[presetName];
    if (!preset) {
      console.warn(`[MaterialSystem] Unknown preset: ${presetName}`);
      return this.createToon({ color: '#ff00ff' });
    }
    return this.create({ ...preset });
  }

  // ─── PBR (Physically Based) ───────────────────────────
  createPBR(config = {}) {
    const {
      color = '#ffffff',
      metalness = 0.0,
      roughness = 0.5,
      normalScale = 1.0,
      emissive = '#000000',
      emissiveIntensity = 0,
      opacity = 1.0,
      transparent = false,
      side = 'front',
      colorMap = null,
      normalMap = null,
      roughnessMap = null,
      metalnessMap = null,
      emissiveMap = null,
      aoMap = null,
      displacementMap = null,
      displacementScale = 0.1,
      envMapIntensity = 1.0,
      flatShading = false,
      wireframe = false,
    } = config;

    const params = {
      color: new THREE.Color(color),
      metalness,
      roughness,
      emissive: new THREE.Color(emissive),
      emissiveIntensity,
      opacity,
      transparent: transparent || opacity < 1,
      side: side === 'double' ? THREE.DoubleSide : side === 'back' ? THREE.BackSide : THREE.FrontSide,
      flatShading,
      wireframe,
      envMapIntensity,
    };

    // Load textures if provided
    if (colorMap) params.map = this._loadTexture(colorMap);
    if (normalMap) {
      params.normalMap = this._loadTexture(normalMap);
      params.normalScale = new THREE.Vector2(normalScale, normalScale);
    }
    if (roughnessMap) params.roughnessMap = this._loadTexture(roughnessMap);
    if (metalnessMap) params.metalnessMap = this._loadTexture(metalnessMap);
    if (emissiveMap) params.emissiveMap = this._loadTexture(emissiveMap);
    if (aoMap) params.aoMap = this._loadTexture(aoMap);
    if (displacementMap) {
      params.displacementMap = this._loadTexture(displacementMap);
      params.displacementScale = displacementScale;
    }

    // Environment map for reflections
    if (this._envMap) params.envMap = this._envMap;

    const mat = new THREE.MeshStandardMaterial(params);
    mat.userData._novaConfig = { type: 'pbr', ...config };
    return mat;
  }

  // ─── Toon/Cel-shaded ─────────────────────────────────
  createToon(config = {}) {
    const {
      color = '#66bb55',
      steps = 3,
      emissive = '#000000',
      emissiveIntensity = 0,
      wireframe = false,
      flatShading = false,
      opacity = 1.0,
      transparent = false,
      side = 'front',
    } = config;

    const gradientMap = this._createGradientTexture(steps);

    const params = {
      color: new THREE.Color(color),
      gradientMap,
      emissive: new THREE.Color(emissive),
      emissiveIntensity,
      wireframe,
      opacity,
      transparent: transparent || opacity < 1,
      side: side === 'double' ? THREE.DoubleSide : side === 'back' ? THREE.BackSide : THREE.FrontSide,
    };

    const mat = new THREE.MeshToonMaterial(params);
    mat.userData._novaConfig = { type: 'toon', ...config };
    return mat;
  }

  // ─── Unlit ────────────────────────────────────────────
  createUnlit(config = {}) {
    const {
      color = '#ffffff',
      emissive = '#000000',
      emissiveIntensity = 0,
      wireframe = false,
      opacity = 1.0,
      transparent = false,
      side = 'front',
      colorMap = null,
    } = config;

    const params = {
      color: new THREE.Color(color),
      wireframe,
      opacity,
      transparent: transparent || opacity < 1,
      side: side === 'double' ? THREE.DoubleSide : side === 'back' ? THREE.BackSide : THREE.FrontSide,
    };

    if (colorMap) params.map = this._loadTexture(colorMap);

    const mat = new THREE.MeshBasicMaterial(params);
    mat.userData._novaConfig = { type: 'unlit', ...config };
    return mat;
  }

  // ─── Custom Shader ────────────────────────────────────
  createCustomShader(config = {}) {
    const {
      vertexShader = 'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader = 'void main() { gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0); }',
      uniforms = {},
      transparent = false,
      side = 'front',
    } = config;

    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: THREE.UniformsUtils.merge([uniforms]),
      transparent,
      side: side === 'double' ? THREE.DoubleSide : THREE.FrontSide,
    });
    mat.userData._novaConfig = { type: 'custom', ...config };
    return mat;
  }

  // ─── Environment Map ──────────────────────────────────
  /**
   * Set an environment map for PBR reflections
   * @param {string} path - Path to equirectangular HDR/image
   */
  setEnvironmentMap(path) {
    const tex = this._loadTexture(path);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    this._envMap = tex;
    this.engine.scene.environment = tex;
  }

  /**
   * Generate a simple procedural environment
   */
  setProceduralEnvironment(topColor = '#87CEEB', bottomColor = '#445522') {
    const pmrem = new THREE.PMREMGenerator(this.engine.renderer.three);
    const scene = new THREE.Scene();
    const hemi = new THREE.HemisphereLight(
      new THREE.Color(topColor),
      new THREE.Color(bottomColor),
      1.0
    );
    scene.add(hemi);
    this._envMap = pmrem.fromScene(scene).texture;
    this.engine.scene.environment = this._envMap;
    pmrem.dispose();
  }

  // ─── Texture Loading ──────────────────────────────────
  _loadTexture(path) {
    if (this._textureCache.has(path)) return this._textureCache.get(path);
    const tex = this._textureLoader.load(path);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    this._textureCache.set(path, tex);
    return tex;
  }

  _createGradientTexture(steps = 3) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(steps, 2);
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const v = Math.round(t * 255);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(i, 0, 1, 1);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    return tex;
  }

  // ─── Material Serialization ───────────────────────────
  /**
   * Serialize a material to JSON (for saving projects)
   */
  serialize(material) {
    if (material.userData?._novaConfig) {
      return { ...material.userData._novaConfig };
    }
    // Fallback: try to extract basic properties
    return {
      type: material.isMeshStandardMaterial ? 'pbr' :
            material.isMeshToonMaterial ? 'toon' :
            material.isMeshBasicMaterial ? 'unlit' : 'unknown',
      color: '#' + (material.color?.getHexString() || 'ffffff'),
      metalness: material.metalness ?? 0,
      roughness: material.roughness ?? 0.5,
      opacity: material.opacity ?? 1,
    };
  }

  /**
   * Deserialize a material from JSON
   */
  deserialize(data) {
    return this.create(data);
  }

  /**
   * Get list of all presets grouped by type
   */
  static getPresetList() {
    const groups = { pbr: [], toon: [], unlit: [] };
    for (const [name, config] of Object.entries(MaterialPresets)) {
      const type = config.type || 'toon';
      if (groups[type]) groups[type].push({ name, ...config });
    }
    return groups;
  }
}
