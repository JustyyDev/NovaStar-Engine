/**
 * NovaStar Mesh Builder
 * Helpers for creating cartoony low-poly game objects
 */

import * as THREE from 'three';

export class MeshBuilder {
  constructor(engine) {
    this.engine = engine;
  }

  /**
   * Create a low-poly character (capsule-like shape)
   */
  character(options = {}) {
    const {
      color = 0x44aaff,
      height = 1.2,
      radius = 0.4,
      eyeColor = 0xffffff,
      pupilColor = 0x222222,
    } = options;

    const group = new THREE.Group();

    // Body (rounded cylinder made from sphere + cylinder)
    const bodyGeom = new THREE.CylinderGeometry(radius, radius * 0.9, height * 0.6, 8);
    const bodyMat = this.engine.renderer.createCartoonMaterial(color);
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = height * 0.3;
    body.castShadow = true;
    group.add(body);

    // Head
    const headGeom = new THREE.SphereGeometry(radius * 0.85, 8, 6);
    const head = new THREE.Mesh(headGeom, bodyMat);
    head.position.y = height * 0.7;
    head.castShadow = true;
    group.add(head);

    // Eyes
    const eyeGeom = new THREE.SphereGeometry(radius * 0.2, 6, 4);
    const eyeMat = new THREE.MeshToonMaterial({ color: eyeColor });
    const pupilGeom = new THREE.SphereGeometry(radius * 0.12, 6, 4);
    const pupilMat = new THREE.MeshToonMaterial({ color: pupilColor });

    [-1, 1].forEach(side => {
      const eye = new THREE.Mesh(eyeGeom, eyeMat);
      eye.position.set(side * radius * 0.35, height * 0.75, radius * 0.6);
      group.add(eye);

      const pupil = new THREE.Mesh(pupilGeom, pupilMat);
      pupil.position.set(side * radius * 0.35, height * 0.75, radius * 0.72);
      group.add(pupil);
    });

    // Feet
    const footGeom = new THREE.SphereGeometry(radius * 0.3, 6, 4);
    footGeom.scale(1.2, 0.6, 1.4);
    const footMat = this.engine.renderer.createCartoonMaterial(
      new THREE.Color(color).multiplyScalar(0.7)
    );

    [-1, 1].forEach(side => {
      const foot = new THREE.Mesh(footGeom, footMat);
      foot.position.set(side * radius * 0.35, 0.05, radius * 0.15);
      foot.castShadow = true;
      group.add(foot);
    });

    return group;
  }

  /**
   * Create a platform block
   */
  platform(options = {}) {
    const {
      width = 4, height = 0.5, depth = 4,
      color = 0x66bb55,
      topColor = 0x88dd66,
    } = options;

    const group = new THREE.Group();

    // Main block
    const geom = new THREE.BoxGeometry(width, height, depth, 1, 1, 1);
    const mat = this.engine.renderer.createCartoonMaterial(color);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    // Top face (grass/highlight)
    const topGeom = new THREE.BoxGeometry(width + 0.05, 0.08, depth + 0.05);
    const topMat = this.engine.renderer.createCartoonMaterial(topColor);
    const top = new THREE.Mesh(topGeom, topMat);
    top.position.y = height / 2;
    top.receiveShadow = true;
    group.add(top);

    return group;
  }

  /**
   * Create a collectible star/gem
   */
  collectible(options = {}) {
    const {
      color = 0xffdd44,
      size = 0.3,
      shape = 'star', // 'star', 'gem', 'coin'
    } = options;

    let geom;
    if (shape === 'gem') {
      geom = new THREE.OctahedronGeometry(size, 0);
    } else if (shape === 'coin') {
      geom = new THREE.CylinderGeometry(size, size, size * 0.2, 8);
    } else {
      // Star — use octahedron and scale
      geom = new THREE.OctahedronGeometry(size, 0);
      geom.scale(1, 1.5, 1);
    }

    const mat = new THREE.MeshToonMaterial({
      color,
      emissive: new THREE.Color(color).multiplyScalar(0.3),
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;

    // Add a glow sprite
    const glowMat = new THREE.SpriteMaterial({
      color,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.set(size * 4, size * 4, 1);
    mesh.add(glow);

    return mesh;
  }

  /**
   * Create a tree (low-poly)
   */
  tree(options = {}) {
    const {
      trunkColor = 0x886644,
      leafColor = 0x44aa33,
      height = 3,
      leafSize = 1.5,
    } = options;

    const group = new THREE.Group();

    // Trunk
    const trunkGeom = new THREE.CylinderGeometry(0.15, 0.25, height * 0.5, 6);
    const trunkMat = this.engine.renderer.createCartoonMaterial(trunkColor);
    const trunk = new THREE.Mesh(trunkGeom, trunkMat);
    trunk.position.y = height * 0.25;
    trunk.castShadow = true;
    group.add(trunk);

    // Foliage (stacked cones)
    const leafMat = this.engine.renderer.createCartoonMaterial(leafColor);
    for (let i = 0; i < 3; i++) {
      const s = leafSize * (1 - i * 0.2);
      const coneGeom = new THREE.ConeGeometry(s, height * 0.35, 6);
      const cone = new THREE.Mesh(coneGeom, leafMat);
      cone.position.y = height * 0.45 + i * height * 0.2;
      cone.castShadow = true;
      group.add(cone);
    }

    return group;
  }

  /**
   * Create a simple enemy
   */
  enemy(options = {}) {
    const {
      color = 0xdd4444,
      size = 0.6,
      type = 'slime', // 'slime', 'spike'
    } = options;

    const group = new THREE.Group();

    if (type === 'slime') {
      const bodyGeom = new THREE.SphereGeometry(size, 8, 6);
      bodyGeom.scale(1, 0.7, 1);
      const mat = this.engine.renderer.createCartoonMaterial(color);
      const body = new THREE.Mesh(bodyGeom, mat);
      body.position.y = size * 0.5;
      body.castShadow = true;
      group.add(body);

      // Eyes
      const eyeGeom = new THREE.SphereGeometry(size * 0.2, 6, 4);
      const eyeMat = new THREE.MeshToonMaterial({ color: 0xffffff });
      [-1, 1].forEach(side => {
        const eye = new THREE.Mesh(eyeGeom, eyeMat);
        eye.position.set(side * size * 0.3, size * 0.6, size * 0.5);
        group.add(eye);
      });
    } else if (type === 'spike') {
      const spikeGeom = new THREE.ConeGeometry(size * 0.5, size * 1.5, 5);
      const mat = this.engine.renderer.createCartoonMaterial(color);
      const spike = new THREE.Mesh(spikeGeom, mat);
      spike.position.y = size * 0.75;
      spike.castShadow = true;
      group.add(spike);
    }

    return group;
  }

  /**
   * Create the ground plane
   */
  ground(options = {}) {
    const {
      size = 100,
      color = 0x77bb55,
    } = options;

    const geom = new THREE.PlaneGeometry(size, size);
    geom.rotateX(-Math.PI / 2);
    const mat = this.engine.renderer.createCartoonMaterial(color);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.receiveShadow = true;
    return mesh;
  }
}
