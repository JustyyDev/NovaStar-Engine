/**
 * NovaStar Renderer
 * Custom cartoony low-poly rendering pipeline with:
 * - Cel/toon shading
 * - Outline pass
 * - Soft ambient lighting
 * - Color grading for that Nintendo pop
 */

import * as THREE from 'three';

// ─── CUSTOM TOON SHADER ──────────────────────────
export const NovaToonShader = {
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec2 vUv;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform vec3 uLightDir;
    uniform vec3 uAmbientColor;
    uniform float uShadowSoftness;
    uniform float uSpecularPower;
    uniform vec3 uSpecularColor;
    uniform vec3 uShadowColor;

    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec2 vUv;

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 lightDir = normalize(uLightDir);

      // Toon shading with configurable steps
      float NdotL = dot(normal, lightDir);
      float lightIntensity = smoothstep(-uShadowSoftness, uShadowSoftness, NdotL);

      // Quantize to 3 bands for cartoony look
      lightIntensity = floor(lightIntensity * 3.0) / 3.0;

      // Rim light for that Nintendo pop
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      float rim = 1.0 - max(dot(viewDir, normal), 0.0);
      rim = smoothstep(0.55, 0.7, rim);

      // Specular (Blinn-Phong, toon-quantized)
      vec3 halfDir = normalize(lightDir + viewDir);
      float spec = pow(max(dot(normal, halfDir), 0.0), uSpecularPower);
      spec = step(0.5, spec) * 0.3;

      // Combine
      vec3 litColor = uColor * (uAmbientColor + lightIntensity * vec3(1.0));
      vec3 shadowedColor = uColor * uShadowColor;
      vec3 finalColor = mix(shadowedColor, litColor, lightIntensity);
      finalColor += rim * vec3(0.4, 0.45, 0.5);
      finalColor += spec * uSpecularColor;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

// ─── OUTLINE SHADER ──────────────────────────────
export const OutlineShader = {
  vertexShader: `
    uniform float uThickness;
    void main() {
      vec3 pos = position + normal * uThickness;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uOutlineColor;
    void main() {
      gl_FragColor = vec4(uOutlineColor, 1.0);
    }
  `
};


export class Renderer {
  constructor(engine) {
    this.engine = engine;

    // Create WebGL renderer
    this.three = new THREE.WebGLRenderer({
      canvas: engine.canvas,
      antialias: true,
      alpha: false,
    });

    this.three.setSize(engine.options.width, engine.options.height);
    this.three.setPixelRatio(engine.options.pixelRatio);
    this.three.outputColorSpace = THREE.SRGBColorSpace;
    this.three.toneMapping = THREE.ACESFilmicToneMapping;
    this.three.toneMappingExposure = 1.2;
    this.three.shadowMap.enabled = true;
    this.three.shadowMap.type = THREE.PCFSoftShadowMap;
    this.three.setClearColor(0x87CEEB); // Sky blue default

    // Default lighting setup (cartoony, soft)
    this._setupLighting();
  }

  _setupLighting() {
    const scene = this.engine.scene;

    // Hemisphere light for ambient (sky/ground)
    this.hemiLight = new THREE.HemisphereLight(0x88bbff, 0x445522, 0.6);
    scene.add(this.hemiLight);

    // Main directional light (sun)
    this.sunLight = new THREE.DirectionalLight(0xfff4e0, 1.0);
    this.sunLight.position.set(5, 10, 7);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 50;
    this.sunLight.shadow.camera.left = -20;
    this.sunLight.shadow.camera.right = 20;
    this.sunLight.shadow.camera.top = 20;
    this.sunLight.shadow.camera.bottom = -20;
    this.sunLight.shadow.bias = -0.001;
    scene.add(this.sunLight);

    // Fill light (soft, cool tint)
    this.fillLight = new THREE.DirectionalLight(0xaaccff, 0.3);
    this.fillLight.position.set(-3, 4, -5);
    scene.add(this.fillLight);

    // Ambient for minimum visibility
    this.ambientLight = new THREE.AmbientLight(0x404050, 0.2);
    scene.add(this.ambientLight);
  }

  /**
   * Create a NovaStar toon material
   */
  createToonMaterial(color, options = {}) {
    const {
      shadowSoftness = 0.15,
      specularPower = 32,
      specularColor = 0xffffff,
      shadowColor = new THREE.Color(color).multiplyScalar(0.4),
      ambientColor = 0x303040,
    } = options;

    return new THREE.ShaderMaterial({
      vertexShader: NovaToonShader.vertexShader,
      fragmentShader: NovaToonShader.fragmentShader,
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uLightDir: { value: new THREE.Vector3(5, 10, 7).normalize() },
        uAmbientColor: { value: new THREE.Color(ambientColor) },
        uShadowSoftness: { value: shadowSoftness },
        uSpecularPower: { value: specularPower },
        uSpecularColor: { value: new THREE.Color(specularColor) },
        uShadowColor: { value: shadowColor instanceof THREE.Color ? shadowColor : new THREE.Color(shadowColor) },
      }
    });
  }

  /**
   * Create a simple cartoony material (no custom shader, uses MeshToonMaterial)
   */
  createCartoonMaterial(color) {
    const gradientMap = this._createGradientTexture();
    return new THREE.MeshToonMaterial({
      color,
      gradientMap,
    });
  }

  _createGradientTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#444';
    ctx.fillRect(0, 0, 1, 1);
    ctx.fillStyle = '#888';
    ctx.fillRect(1, 0, 1, 1);
    ctx.fillStyle = '#ccc';
    ctx.fillRect(2, 0, 1, 1);
    ctx.fillStyle = '#fff';
    ctx.fillRect(3, 0, 1, 1);
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    return tex;
  }

  /**
   * Set the sky/background
   */
  setSkyColor(topColor, bottomColor) {
    if (bottomColor) {
      // Gradient sky
      const canvas = document.createElement('canvas');
      canvas.width = 2;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, 0, 512);
      gradient.addColorStop(0, '#' + new THREE.Color(topColor).getHexString());
      gradient.addColorStop(1, '#' + new THREE.Color(bottomColor).getHexString());
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 2, 512);
      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      this.engine.scene.background = tex;
    } else {
      this.three.setClearColor(topColor);
    }
  }

  /**
   * Add fog for depth
   */
  setFog(color, near, far) {
    this.engine.scene.fog = new THREE.Fog(color, near, far);
  }

  render(scene, camera) {
    this.three.render(scene, camera);
  }

  resize(width, height) {
    this.three.setSize(width, height);
  }
}
