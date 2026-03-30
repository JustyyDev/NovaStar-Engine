/**
 * NovaStar Demo Game — "Star Hopper"
 * A cartoony 3D platformer showcasing the engine
 */

import * as THREE from 'three';
import { MeshBuilder } from '../engine/MeshBuilder.js';

export function createDemoGame(engine) {
  const builder = new MeshBuilder(engine);
  let player, playerBody, score = 0, gems = 0, lives = 3;
  let cameraOffset = new THREE.Vector3(0, 8, 12);
  let cameraTarget = new THREE.Vector3();
  let canDash = true, dashCooldown = 0;
  let wasGrounded = false;
  let stepTimer = 0;
  let squashStretch = { scaleY: 1, scaleXZ: 1 };

  // HUD elements
  const hudGems = document.getElementById('hud-gems');
  const hudScore = document.getElementById('hud-score');
  const hudLives = document.getElementById('hud-lives');

  // ─── SCENE SETUP ───────────────────────────────
  function init() {
    // Sky
    engine.renderer.setSkyColor(0x6ec6ff, 0xb8e8ff);
    engine.renderer.setFog(0xb8e8ff, 30, 80);

    // Ground
    const ground = builder.ground({ color: 0x77cc55 });
    ground.position.y = -0.5;
    engine.add(ground);

    const groundBody = engine.physics.createBody({
      position: new THREE.Vector3(0, -0.5, 0),
      halfExtents: new THREE.Vector3(50, 0.5, 50),
      isStatic: true,
      tag: 'ground'
    });

    // Player
    player = builder.character({ color: 0x4499ff });
    player.position.set(0, 1, 0);
    engine.add(player);

    playerBody = engine.physics.createBody({
      position: new THREE.Vector3(0, 1.5, 0),
      halfExtents: new THREE.Vector3(0.35, 0.6, 0.35),
      gravity: -30,
      friction: 0.88,
      maxSpeed: 10,
      tag: 'player'
    });

    // Create level
    createLevel();

    // Register update loops
    engine.onUpdate(update);
    engine.onLateUpdate(lateUpdate);

    // Play startup jingle
    engine.audio.playMelody([
      { note: 523, duration: 0.12 },
      { note: 659, duration: 0.12 },
      { note: 784, duration: 0.12 },
      { note: 1047, duration: 0.3 },
    ], 'square', 0.06);
  }

  // ─── LEVEL CREATION ────────────────────────────
  function createLevel() {
    const platforms = [
      { x: 0, y: 0, z: 0, w: 6, d: 6, color: 0x66bb55 },
      { x: 5, y: 1.5, z: -4, w: 3, d: 3, color: 0x55aa88 },
      { x: 10, y: 3, z: -2, w: 3, d: 3, color: 0x5599aa },
      { x: 15, y: 2, z: 0, w: 4, d: 4, color: 0x6688bb },
      { x: 12, y: 4.5, z: 5, w: 3, d: 3, color: 0x7766aa },
      { x: 7, y: 6, z: 8, w: 3, d: 3, color: 0xaa6688 },
      { x: 2, y: 3, z: 6, w: 3, d: 3, color: 0xbbaa55 },
      { x: -4, y: 4.5, z: 4, w: 3, d: 3, color: 0x88bb66 },
      { x: -8, y: 2, z: 0, w: 4, d: 4, color: 0x66bbaa },
      { x: -5, y: 6, z: -5, w: 3, d: 3, color: 0xcc7744 },
      { x: 0, y: 8, z: -8, w: 5, d: 5, color: 0xddaa33 },
      // Moving platform area
      { x: 18, y: 1, z: 5, w: 2.5, d: 2.5, color: 0x44bbcc },
      { x: 22, y: 2.5, z: 3, w: 2.5, d: 2.5, color: 0x44bbcc },
    ];

    platforms.forEach(p => {
      const plat = builder.platform({
        width: p.w, depth: p.d, color: p.color,
        topColor: new THREE.Color(p.color).multiplyScalar(1.3),
      });
      plat.position.set(p.x, p.y, p.z);
      engine.add(plat);

      engine.physics.createBody({
        position: new THREE.Vector3(p.x, p.y, p.z),
        halfExtents: new THREE.Vector3(p.w / 2, 0.3, p.d / 2),
        isStatic: true,
        tag: 'platform'
      });
    });

    // Collectible stars
    const starPositions = [
      { x: 5, y: 3.5, z: -4 },
      { x: 10, y: 5, z: -2 },
      { x: 15, y: 4, z: 0 },
      { x: 12, y: 6.5, z: 5 },
      { x: 7, y: 8, z: 8 },
      { x: 2, y: 5, z: 6 },
      { x: -4, y: 6.5, z: 4 },
      { x: -8, y: 4, z: 0 },
      { x: -5, y: 8, z: -5 },
      { x: 0, y: 10, z: -8 },
      { x: 0, y: 2, z: 0 },
      { x: 18, y: 3, z: 5 },
    ];

    starPositions.forEach((pos, i) => {
      const star = builder.collectible({ color: 0xffdd44, size: 0.35 });
      star.position.set(pos.x, pos.y, pos.z);
      star.userData.index = i;
      star.userData.type = 'star';
      engine.add(star);

      const body = engine.physics.createBody({
        position: new THREE.Vector3(pos.x, pos.y, pos.z),
        halfExtents: new THREE.Vector3(0.4, 0.4, 0.4),
        isStatic: true,
        isTrigger: true,
        tag: 'star',
        owner: star,
      });

      body.onTriggerEnter = (other) => {
        if (other.tag === 'player') {
          collectStar(star, body);
        }
      };
    });

    // Trees for decoration
    const treePositions = [
      { x: -3, z: -3 }, { x: 4, z: 3 }, { x: -6, z: 5 },
      { x: 8, z: -5 }, { x: -2, z: 8 }, { x: 12, z: -6 },
      { x: -10, z: -3 }, { x: 15, z: 7 }, { x: -8, z: 8 },
    ];
    treePositions.forEach(pos => {
      const tree = builder.tree({
        height: 2.5 + Math.random() * 2,
        leafColor: Math.random() > 0.5 ? 0x44aa33 : 0x33bb55,
      });
      tree.position.set(pos.x, 0, pos.z);
      tree.rotation.y = Math.random() * Math.PI * 2;
      engine.add(tree);
    });

    // Enemies (slimes)
    const enemyPositions = [
      { x: 5, y: 2.5, z: -4, range: 2 },
      { x: 15, y: 3, z: 0, range: 3 },
      { x: -8, y: 3, z: 0, range: 3 },
    ];

    enemyPositions.forEach(pos => {
      const slime = builder.enemy({ color: 0xdd4444, size: 0.5 });
      slime.position.set(pos.x, pos.y, pos.z);
      slime.userData.startX = pos.x;
      slime.userData.range = pos.range;
      slime.userData.type = 'enemy';
      engine.add(slime);

      const body = engine.physics.createBody({
        position: new THREE.Vector3(pos.x, pos.y, pos.z),
        halfExtents: new THREE.Vector3(0.4, 0.3, 0.4),
        isStatic: true,
        isTrigger: true,
        tag: 'enemy',
        owner: slime,
      });

      body.onTriggerEnter = (other) => {
        if (other.tag === 'player') {
          // Check if player is above (stomp) or hitting from side (hurt)
          if (other.position.y > body.position.y + 0.3) {
            // Stomp!
            other.velocity.y = 15;
            engine.audio.play('bounce');
            engine.particles.explosionEffect(body.position.clone(), 0xdd4444);
            engine.scene.remove(slime);
            engine.physics.removeBody(body);
            score += 50;
          } else {
            hurtPlayer();
          }
        }
      };
    });
  }

  // ─── COLLECT STAR ──────────────────────────────
  function collectStar(mesh, body) {
    engine.audio.play('collect');
    engine.particles.collectEffect(mesh.position.clone());
    engine.scene.remove(mesh);
    engine.physics.removeBody(body);
    gems++;
    score += 10;
    updateHUD();
  }

  // ─── HURT PLAYER ───────────────────────────────
  function hurtPlayer() {
    lives--;
    engine.audio.play('hurt');
    engine.particles.explosionEffect(player.position.clone(), 0xff4444);
    updateHUD();

    // Knockback
    playerBody.velocity.y = 10;
    playerBody.velocity.x = -playerBody.velocity.x * 0.5;

    if (lives <= 0) {
      // Reset
      lives = 3;
      gems = 0;
      score = 0;
      playerBody.position.set(0, 3, 0);
      playerBody.velocity.set(0, 0, 0);
      updateHUD();
    }
  }

  // ─── UPDATE LOOP ───────────────────────────────
  function update(dt) {
    const move = engine.input.getMovement();
    const speed = 18;

    // Movement relative to camera direction
    const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(engine.camera.quaternion);
    camForward.y = 0;
    camForward.normalize();
    const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(engine.camera.quaternion);
    camRight.y = 0;
    camRight.normalize();

    const moveDir = new THREE.Vector3();
    moveDir.addScaledVector(camRight, move.x);
    moveDir.addScaledVector(camForward, -move.y);

    if (moveDir.length() > 0) {
      moveDir.normalize();
      playerBody.velocity.x += moveDir.x * speed * dt;
      playerBody.velocity.z += moveDir.z * speed * dt;

      // Rotate player to face movement direction
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      const currentAngle = player.rotation.y;
      let diff = targetAngle - currentAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      player.rotation.y += diff * 12 * dt;

      // Footstep sounds
      if (playerBody.isGrounded) {
        stepTimer += dt;
        if (stepTimer > 0.25) {
          engine.audio.play('step');
          stepTimer = 0;
        }
      }
    } else {
      stepTimer = 0.2; // Ready for immediate step sound
    }

    // Jump
    if (engine.input.isActionJustPressed('jump') && playerBody.isGrounded) {
      playerBody.velocity.y = 14;
      engine.audio.play('jump');
      engine.particles.jumpEffect(player.position.clone());
      squashStretch.scaleY = 1.3;
      squashStretch.scaleXZ = 0.7;
    }

    // Dash
    dashCooldown -= dt;
    if (engine.input.isActionJustPressed('dash') && canDash && dashCooldown <= 0) {
      const dashDir = moveDir.length() > 0 ? moveDir : new THREE.Vector3(0, 0, -1).applyQuaternion(engine.camera.quaternion);
      dashDir.y = 0;
      dashDir.normalize();
      playerBody.velocity.x = dashDir.x * 20;
      playerBody.velocity.z = dashDir.z * 20;
      engine.audio.play('dash');
      engine.particles.dashEffect(player.position.clone());
      dashCooldown = 0.5;
      squashStretch.scaleY = 0.7;
      squashStretch.scaleXZ = 1.4;
    }

    // Landing detection
    if (playerBody.isGrounded && !wasGrounded) {
      engine.audio.play('land');
      engine.particles.landEffect(player.position.clone());
      squashStretch.scaleY = 0.7;
      squashStretch.scaleXZ = 1.3;
    }
    wasGrounded = playerBody.isGrounded;

    // Squash & stretch recovery
    squashStretch.scaleY += (1 - squashStretch.scaleY) * 8 * dt;
    squashStretch.scaleXZ += (1 - squashStretch.scaleXZ) * 8 * dt;
    player.scale.set(squashStretch.scaleXZ, squashStretch.scaleY, squashStretch.scaleXZ);

    // Sync mesh to physics
    player.position.copy(playerBody.position);
    player.position.y -= 0.6;

    // Fall reset
    if (playerBody.position.y < -10) {
      hurtPlayer();
      playerBody.position.set(0, 5, 0);
      playerBody.velocity.set(0, 0, 0);
    }

    // Animate collectibles (bob + spin)
    engine.scene.traverse(obj => {
      if (obj.userData.type === 'star') {
        obj.rotation.y += 2 * dt;
        obj.position.y += Math.sin(engine.elapsedTime * 3 + obj.userData.index) * 0.3 * dt;
      }
    });

    // Animate enemies (patrol)
    engine.scene.traverse(obj => {
      if (obj.userData.type === 'enemy') {
        const startX = obj.userData.startX;
        const range = obj.userData.range;
        obj.position.x = startX + Math.sin(engine.elapsedTime * 1.5) * range;
        // Bounce animation
        obj.position.y += Math.abs(Math.sin(engine.elapsedTime * 4)) * 0.15;
        obj.scale.y = 0.8 + Math.abs(Math.sin(engine.elapsedTime * 4)) * 0.3;
        obj.scale.x = 1.1 - Math.abs(Math.sin(engine.elapsedTime * 4)) * 0.15;
        obj.scale.z = obj.scale.x;

        // Update physics body position
        for (const body of engine.physics.bodies) {
          if (body.owner === obj) {
            body.position.x = obj.position.x;
          }
        }
      }
    });

    updateHUD();
  }

  // ─── CAMERA ────────────────────────────────────
  function lateUpdate(dt) {
    // Smooth camera follow
    cameraTarget.lerp(player.position, 6 * dt);
    engine.camera.position.copy(cameraTarget).add(cameraOffset);
    engine.camera.lookAt(cameraTarget.x, cameraTarget.y + 1, cameraTarget.z);
  }

  // ─── HUD ───────────────────────────────────────
  function updateHUD() {
    if (hudGems) hudGems.textContent = gems;
    if (hudScore) hudScore.textContent = score;
    if (hudLives) hudLives.textContent = '♥'.repeat(Math.max(0, lives));
  }

  return { init };
}
