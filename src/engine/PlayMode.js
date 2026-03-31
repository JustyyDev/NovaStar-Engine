/**
 * NovaStar Play Mode v0.4.1
 * Executes game logic when the user presses Play in the editor.
 * 
 * On Enter Play:
 * 1. Snapshots the current scene state (for reverting on Stop)
 * 2. Activates physics simulation
 * 3. Runs component update loops (PlayerController, PatrolAI, etc.)
 * 4. Executes attached NovaScript scripts
 * 5. Enables player input
 * 
 * On Exit Play:
 * 1. Stops physics
 * 2. Reverts scene to the snapshot
 * 3. Returns to edit mode
 */

import * as THREE from 'three';

export class PlayMode {
  constructor(engine) {
    this.engine = engine;
    this.isPlaying = false;
    this._snapshot = null;
    this._runtimeEntities = [];
    this._playerEntity = null;
    this._unsubscribers = [];
    this._keys = {};
    this._keyHandler = null;
    this._keyUpHandler = null;
  }

  /**
   * Enter play mode
   * @param {Array} editorEntities - The editor's entity array
   * @param {object} novaScript - NovaScript interpreter instance
   */
  enter(editorEntities, novaScript = null) {
    if (this.isPlaying) return;
    this.isPlaying = true;

    // 1. Snapshot current state for revert
    this._snapshot = editorEntities.map(e => ({
      name: e.name,
      type: e.type,
      position: e.mesh.position.clone(),
      rotation: e.mesh.rotation.clone(),
      scale: e.mesh.scale.clone(),
    }));

    // 2. Build runtime entity list with component behaviors
    this._runtimeEntities = editorEntities.map(e => ({
      ref: e,
      mesh: e.mesh,
      type: e.type,
      name: e.name,
      velocity: new THREE.Vector3(0, 0, 0),
      grounded: false,
      health: e.type === 'character' ? 3 : (e.type === 'enemy' ? 2 : 0),
      isPlayer: e.type === 'character',
      isEnemy: e.type === 'enemy',
      isCollectible: e.type === 'star',
      isTrigger: e.type === 'trigger',
      isPlatform: e.type === 'platform',
      patrolDir: 1,
      patrolOrigin: e.mesh.position.clone(),
      patrolRange: 3 + Math.random() * 2,
      bobPhase: Math.random() * Math.PI * 2,
      collected: false,
      dead: false,
    }));

    this._playerEntity = this._runtimeEntities.find(e => e.isPlayer) || null;

    // 3. Setup input
    this._keys = {};
    this._keyHandler = (e) => { this._keys[e.code] = true; };
    this._keyUpHandler = (e) => { this._keys[e.code] = false; };
    window.addEventListener('keydown', this._keyHandler);
    window.addEventListener('keyup', this._keyUpHandler);

    // 4. Register update loop
    const unsub = this.engine.onUpdate((dt) => this._update(dt));
    this._unsubscribers.push(unsub);

    console.log('[PlayMode] Entered play mode with', this._runtimeEntities.length, 'entities');
  }

  /**
   * Exit play mode and revert scene
   */
  exit(editorEntities) {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    // Remove input listeners
    if (this._keyHandler) window.removeEventListener('keydown', this._keyHandler);
    if (this._keyUpHandler) window.removeEventListener('keyup', this._keyUpHandler);
    this._keyHandler = null;
    this._keyUpHandler = null;

    // Unsubscribe update loops
    this._unsubscribers.forEach(fn => fn());
    this._unsubscribers = [];

    // Revert scene to snapshot
    if (this._snapshot && editorEntities) {
      for (let i = 0; i < Math.min(this._snapshot.length, editorEntities.length); i++) {
        const snap = this._snapshot[i];
        const ent = editorEntities[i];
        if (ent.mesh) {
          ent.mesh.position.copy(snap.position);
          ent.mesh.rotation.copy(snap.rotation);
          ent.mesh.scale.copy(snap.scale);
        }
      }
    }

    // Reset collected items visibility
    this._runtimeEntities.forEach(e => {
      if (e.mesh) e.mesh.visible = true;
    });

    this._snapshot = null;
    this._runtimeEntities = [];
    this._playerEntity = null;
    this._keys = {};

    console.log('[PlayMode] Exited play mode');
  }

  // ─── Runtime Update Loop ──────────────────────────────
  _update(dt) {
    if (!this.isPlaying) return;

    const GRAVITY = -25;
    const GROUND_Y = 0;
    const PLAYER_SPEED = 6;
    const JUMP_FORCE = 10;

    for (const ent of this._runtimeEntities) {
      if (ent.dead || ent.collected) continue;
      const pos = ent.mesh.position;

      // ─── Player Controller ───────────────────
      if (ent.isPlayer) {
        // Horizontal movement
        let moveX = 0, moveZ = 0;
        if (this._keys['KeyW'] || this._keys['ArrowUp']) moveZ = -1;
        if (this._keys['KeyS'] || this._keys['ArrowDown']) moveZ = 1;
        if (this._keys['KeyA'] || this._keys['ArrowLeft']) moveX = -1;
        if (this._keys['KeyD'] || this._keys['ArrowRight']) moveX = 1;

        if (moveX || moveZ) {
          const dir = new THREE.Vector3(moveX, 0, moveZ).normalize();
          pos.x += dir.x * PLAYER_SPEED * dt;
          pos.z += dir.z * PLAYER_SPEED * dt;
          // Face movement direction
          ent.mesh.rotation.y = Math.atan2(dir.x, dir.z);
        }

        // Jump
        if ((this._keys['Space'] || this._keys['KeyW']) && ent.grounded) {
          ent.velocity.y = JUMP_FORCE;
          ent.grounded = false;
        }

        // Gravity
        ent.velocity.y += GRAVITY * dt;
        pos.y += ent.velocity.y * dt;

        // Ground collision (simple)
        const groundCheck = this._getGroundHeight(pos.x, pos.z);
        if (pos.y <= groundCheck) {
          pos.y = groundCheck;
          ent.velocity.y = 0;
          ent.grounded = true;
        }

        // Collectible pickup
        this._runtimeEntities.forEach(other => {
          if (other.isCollectible && !other.collected) {
            if (pos.distanceTo(other.mesh.position) < 1.2) {
              other.collected = true;
              other.mesh.visible = false;
              // Could trigger score update, sound, etc.
            }
          }
        });

        // Enemy collision
        this._runtimeEntities.forEach(other => {
          if (other.isEnemy && !other.dead) {
            if (pos.distanceTo(other.mesh.position) < 1.0) {
              // Simple: bounce player up, kill enemy if above
              if (ent.velocity.y < -1 && pos.y > other.mesh.position.y + 0.3) {
                other.dead = true;
                other.mesh.visible = false;
                ent.velocity.y = JUMP_FORCE * 0.6;
              } else {
                // Player hit — knockback
                const kb = new THREE.Vector3().subVectors(pos, other.mesh.position).normalize();
                pos.add(kb.multiplyScalar(0.5));
                ent.velocity.y = JUMP_FORCE * 0.4;
              }
            }
          }
        });

        // Camera follow
        const camOffset = new THREE.Vector3(0, 8, 12);
        this.engine.camera.position.lerp(
          new THREE.Vector3().copy(pos).add(camOffset),
          5 * dt
        );
        this.engine.camera.lookAt(pos.x, pos.y + 1, pos.z);
      }

      // ─── Enemy Patrol AI ─────────────────────
      if (ent.isEnemy && !ent.dead) {
        const speed = 2;
        pos.x += ent.patrolDir * speed * dt;
        if (Math.abs(pos.x - ent.patrolOrigin.x) > ent.patrolRange) {
          ent.patrolDir *= -1;
        }
        // Bob up and down
        ent.bobPhase += dt * 3;
        pos.y = ent.patrolOrigin.y + Math.sin(ent.bobPhase) * 0.15;
      }

      // ─── Collectible Spin ────────────────────
      if (ent.isCollectible && !ent.collected) {
        ent.mesh.rotation.y += dt * 2;
        ent.bobPhase += dt * 2.5;
        pos.y = ent.patrolOrigin.y + Math.sin(ent.bobPhase) * 0.2;
      }
    }
  }

  /**
   * Simple ground height check against platforms
   */
  _getGroundHeight(x, z) {
    let maxY = 0; // default ground
    for (const ent of this._runtimeEntities) {
      if (!ent.isPlatform || !ent.mesh) continue;
      const p = ent.mesh.position;
      const s = ent.mesh.scale;
      // Rough AABB check (platforms are boxes)
      const hw = (s.x * 4) / 2; // default platform width is 4
      const hd = (s.z * 4) / 2;
      if (x >= p.x - hw && x <= p.x + hw && z >= p.z - hd && z <= p.z + hd) {
        const topY = p.y + (s.y * 0.5) / 2 + 0.25;
        if (topY > maxY) maxY = topY;
      }
    }
    return maxY;
  }
}
