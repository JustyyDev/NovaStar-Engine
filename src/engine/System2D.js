/**
 * NovaStar 2D System
 * Sprite rendering, tilemaps, 2D physics helpers
 * Uses Three.js with orthographic camera for 2D games
 */

import * as THREE from 'three';

export class System2D {
  constructor(engine) {
    this.engine = engine;
    this.sprites = [];
    this.tilemaps = [];

    // 2D camera (orthographic)
    this.camera2D = null;
    this._is2DMode = false;
  }

  /**
   * Enable 2D mode — switches to orthographic camera
   */
  enable2D(options = {}) {
    const {
      pixelsPerUnit = 32,
      width = window.innerWidth,
      height = window.innerHeight,
    } = options;

    this._is2DMode = true;
    this._pixelsPerUnit = pixelsPerUnit;

    const aspect = width / height;
    const viewHeight = height / pixelsPerUnit;
    const viewWidth = viewHeight * aspect;

    this.camera2D = new THREE.OrthographicCamera(
      -viewWidth / 2, viewWidth / 2,
      viewHeight / 2, -viewHeight / 2,
      0.1, 1000
    );
    this.camera2D.position.z = 100;

    // Replace the engine camera
    this.engine.camera = this.camera2D;

    // Disable 3D lighting for flat look
    this.engine.renderer.three.setClearColor(
      options.backgroundColor || 0x222244
    );

    console.log('[NovaStar 2D] 2D mode enabled');
  }

  /**
   * Create a sprite from a color (for prototyping)
   */
  createColorSprite(options = {}) {
    const {
      width = 1, height = 1,
      color = 0xffffff,
      x = 0, y = 0,
      layer = 0,
    } = options;

    const geom = new THREE.PlaneGeometry(width, height);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, y, layer * 0.01);
    this.engine.scene.add(mesh);

    const sprite = {
      mesh,
      width, height,
      get x() { return mesh.position.x; },
      set x(v) { mesh.position.x = v; },
      get y() { return mesh.position.y; },
      set y(v) { mesh.position.y = v; },
      get rotation() { return mesh.rotation.z; },
      set rotation(v) { mesh.rotation.z = v; },
      get scaleX() { return mesh.scale.x; },
      set scaleX(v) { mesh.scale.x = v; },
      get scaleY() { return mesh.scale.y; },
      set scaleY(v) { mesh.scale.y = v; },
      get visible() { return mesh.visible; },
      set visible(v) { mesh.visible = v; },
      setColor: (c) => { mat.color.set(c); return sprite; },
      setAlpha: (a) => { mat.opacity = a; return sprite; },
      destroy: () => {
        this.engine.scene.remove(mesh);
        const i = this.sprites.indexOf(sprite);
        if (i !== -1) this.sprites.splice(i, 1);
      },
    };

    this.sprites.push(sprite);
    return sprite;
  }

  /**
   * Create a sprite from a texture URL
   */
  createSprite(textureUrl, options = {}) {
    const {
      width = 1, height = 1,
      x = 0, y = 0,
      layer = 0,
      pixelArt = true,
    } = options;

    const tex = new THREE.TextureLoader().load(textureUrl);
    if (pixelArt) {
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
    }

    const geom = new THREE.PlaneGeometry(width, height);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, y, layer * 0.01);
    this.engine.scene.add(mesh);

    const sprite = {
      mesh, texture: tex, width, height,
      get x() { return mesh.position.x; },
      set x(v) { mesh.position.x = v; },
      get y() { return mesh.position.y; },
      set y(v) { mesh.position.y = v; },
      get rotation() { return mesh.rotation.z; },
      set rotation(v) { mesh.rotation.z = v; },
      flipX: false,
      flipY: false,
      flip: (x, y) => {
        sprite.flipX = x ?? sprite.flipX;
        sprite.flipY = y ?? sprite.flipY;
        mesh.scale.x = sprite.flipX ? -Math.abs(mesh.scale.x) : Math.abs(mesh.scale.x);
        mesh.scale.y = sprite.flipY ? -Math.abs(mesh.scale.y) : Math.abs(mesh.scale.y);
        return sprite;
      },
      setFrame: (frameX, frameY, totalFramesX, totalFramesY) => {
        tex.repeat.set(1 / totalFramesX, 1 / totalFramesY);
        tex.offset.set(frameX / totalFramesX, 1 - (frameY + 1) / totalFramesY);
        return sprite;
      },
      destroy: () => {
        this.engine.scene.remove(mesh);
        const i = this.sprites.indexOf(sprite);
        if (i !== -1) this.sprites.splice(i, 1);
      },
    };

    this.sprites.push(sprite);
    return sprite;
  }

  /**
   * Sprite sheet animation controller
   */
  createAnimator(sprite, options = {}) {
    const {
      frameWidth = 1,
      frameHeight = 1,
      totalColumns = 1,
      totalRows = 1,
    } = options;

    const animations = new Map();
    let currentAnim = null;
    let currentFrame = 0;
    let elapsed = 0;
    let playing = false;

    const animator = {
      addAnimation: (name, frames, fps = 10, loop = true) => {
        animations.set(name, { frames, fps, loop });
        return animator;
      },
      play: (name) => {
        if (currentAnim === name && playing) return animator;
        currentAnim = name;
        currentFrame = 0;
        elapsed = 0;
        playing = true;
        return animator;
      },
      stop: () => { playing = false; return animator; },
      update: (dt) => {
        if (!playing || !currentAnim) return;
        const anim = animations.get(currentAnim);
        if (!anim) return;

        elapsed += dt;
        const frameDuration = 1 / anim.fps;
        if (elapsed >= frameDuration) {
          elapsed -= frameDuration;
          currentFrame++;
          if (currentFrame >= anim.frames.length) {
            if (anim.loop) currentFrame = 0;
            else { currentFrame = anim.frames.length - 1; playing = false; }
          }
        }

        const frame = anim.frames[currentFrame];
        const col = frame % totalColumns;
        const row = Math.floor(frame / totalColumns);
        sprite.setFrame(col, row, totalColumns, totalRows);
      },
      get current() { return currentAnim; },
      get frame() { return currentFrame; },
      get isPlaying() { return playing; },
    };

    return animator;
  }

  /**
   * Create a tilemap
   */
  createTilemap(options = {}) {
    const {
      tileSize = 1,
      width = 16,
      height = 16,
      layers = 1,
    } = options;

    const data = Array.from({ length: layers }, () =>
      Array.from({ length: height }, () =>
        new Array(width).fill(-1)
      )
    );

    const meshes = new Map();
    const tileColors = new Map();
    tileColors.set(0, 0x4a8f3f); // grass
    tileColors.set(1, 0x8b7355); // dirt
    tileColors.set(2, 0x6b6b6b); // stone
    tileColors.set(3, 0x3366cc); // water
    tileColors.set(4, 0xcc6633); // lava
    tileColors.set(5, 0xdddddd); // snow
    tileColors.set(6, 0x886644); // wood

    const tilemap = {
      data, tileSize, width, height,

      setTile: (layer, x, y, tileId) => {
        if (x < 0 || x >= width || y < 0 || y >= height) return;
        data[layer][y][x] = tileId;
        tilemap.rebuild();
      },

      getTile: (layer, x, y) => {
        if (x < 0 || x >= width || y < 0 || y >= height) return -1;
        return data[layer][y][x];
      },

      fill: (layer, tileId) => {
        for (let y = 0; y < height; y++)
          for (let x = 0; x < width; x++)
            data[layer][y][x] = tileId;
        tilemap.rebuild();
      },

      setColorForTile: (tileId, color) => {
        tileColors.set(tileId, color);
      },

      rebuild: () => {
        // Clear existing meshes
        for (const m of meshes.values()) this.engine.scene.remove(m);
        meshes.clear();

        for (let l = 0; l < layers; l++) {
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const tileId = data[l][y][x];
              if (tileId < 0) continue;

              const geom = new THREE.PlaneGeometry(tileSize, tileSize);
              const color = tileColors.get(tileId) || 0xff00ff;
              const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
              const mesh = new THREE.Mesh(geom, mat);
              mesh.position.set(
                x * tileSize + tileSize / 2,
                -(y * tileSize + tileSize / 2),
                l * 0.01
              );
              this.engine.scene.add(mesh);

              const key = `${l}_${x}_${y}`;
              meshes.set(key, mesh);
            }
          }
        }
      },

      worldToTile: (worldX, worldY) => ({
        x: Math.floor(worldX / tileSize),
        y: Math.floor(-worldY / tileSize),
      }),

      tileToWorld: (tileX, tileY) => ({
        x: tileX * tileSize + tileSize / 2,
        y: -(tileY * tileSize + tileSize / 2),
      }),

      isSolid: (layer, x, y) => {
        const tileId = tilemap.getTile(layer, x, y);
        return tileId >= 0 && tileId !== 3; // water is not solid
      },

      destroy: () => {
        for (const m of meshes.values()) this.engine.scene.remove(m);
        meshes.clear();
        const i = this.tilemaps.indexOf(tilemap);
        if (i !== -1) this.tilemaps.splice(i, 1);
      },
    };

    this.tilemaps.push(tilemap);
    return tilemap;
  }

  /**
   * Simple 2D collision check (AABB)
   */
  overlap(a, b) {
    const halfAW = (a.width || 1) / 2;
    const halfAH = (a.height || 1) / 2;
    const halfBW = (b.width || 1) / 2;
    const halfBH = (b.height || 1) / 2;

    return (
      a.x - halfAW < b.x + halfBW &&
      a.x + halfAW > b.x - halfBW &&
      a.y - halfAH < b.y + halfBH &&
      a.y + halfAH > b.y - halfBH
    );
  }

  /**
   * Distance between two 2D points
   */
  distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Move towards a target at a given speed
   */
  moveTowards(sprite, targetX, targetY, speed, dt) {
    const dx = targetX - sprite.x;
    const dy = targetY - sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < speed * dt) {
      sprite.x = targetX;
      sprite.y = targetY;
      return true; // Arrived
    }
    sprite.x += (dx / dist) * speed * dt;
    sprite.y += (dy / dist) * speed * dt;
    return false;
  }
}
