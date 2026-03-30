/**
 * NovaStar Physics World
 * Simple AABB physics for platformers
 * - Gravity, ground detection, basic collisions
 * - No external physics library needed
 */

import * as THREE from 'three';

export class PhysicsBody {
  constructor(options = {}) {
    this.position = options.position || new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.acceleration = new THREE.Vector3();

    // Size for AABB
    this.halfExtents = options.halfExtents || new THREE.Vector3(0.5, 0.5, 0.5);

    // Physics properties
    this.mass = options.mass ?? 1;
    this.gravity = options.gravity ?? -25;
    this.friction = options.friction ?? 0.9;
    this.bounciness = options.bounciness ?? 0;
    this.maxSpeed = options.maxSpeed ?? 15;

    // State
    this.isGrounded = false;
    this.isStatic = options.isStatic ?? false;
    this.isTrigger = options.isTrigger ?? false; // No physical collision, just detection
    this.enabled = true;

    // Collision callback
    this.onCollision = null;
    this.onTriggerEnter = null;

    // Tags for filtering
    this.tag = options.tag || 'default';

    // Link to entity/mesh
    this.owner = options.owner || null;
  }

  get min() {
    return new THREE.Vector3(
      this.position.x - this.halfExtents.x,
      this.position.y - this.halfExtents.y,
      this.position.z - this.halfExtents.z
    );
  }

  get max() {
    return new THREE.Vector3(
      this.position.x + this.halfExtents.x,
      this.position.y + this.halfExtents.y,
      this.position.z + this.halfExtents.z
    );
  }
}


export class PhysicsWorld {
  constructor(engine) {
    this.engine = engine;
    this.bodies = [];
    this.gravity = -25;
    this._triggerCache = new Set(); // Track active triggers
  }

  /**
   * Create and register a physics body
   */
  createBody(options = {}) {
    const body = new PhysicsBody({
      gravity: this.gravity,
      ...options
    });
    this.bodies.push(body);
    return body;
  }

  removeBody(body) {
    const idx = this.bodies.indexOf(body);
    if (idx !== -1) this.bodies.splice(idx, 1);
  }

  /**
   * Step the physics simulation
   */
  step(dt) {
    const dynamicBodies = this.bodies.filter(b => !b.isStatic && b.enabled);
    const allBodies = this.bodies.filter(b => b.enabled);

    for (const body of dynamicBodies) {
      // Apply gravity
      body.velocity.y += body.gravity * dt;

      // Apply acceleration
      body.velocity.x += body.acceleration.x * dt;
      body.velocity.z += body.acceleration.z * dt;

      // Clamp speed
      const horizSpeed = Math.sqrt(body.velocity.x ** 2 + body.velocity.z ** 2);
      if (horizSpeed > body.maxSpeed) {
        const scale = body.maxSpeed / horizSpeed;
        body.velocity.x *= scale;
        body.velocity.z *= scale;
      }

      // Apply friction (horizontal only)
      body.velocity.x *= body.friction;
      body.velocity.z *= body.friction;

      // Move
      body.position.x += body.velocity.x * dt;
      body.position.y += body.velocity.y * dt;
      body.position.z += body.velocity.z * dt;

      // Reset grounded
      body.isGrounded = false;

      // Check collisions against all bodies
      for (const other of allBodies) {
        if (other === body) continue;
        if (!this._aabbOverlap(body, other)) continue;

        if (other.isTrigger) {
          // Trigger collision
          const key = `${body.tag}_${other.tag}_${this.bodies.indexOf(body)}_${this.bodies.indexOf(other)}`;
          if (!this._triggerCache.has(key)) {
            this._triggerCache.add(key);
            if (other.onTriggerEnter) other.onTriggerEnter(body);
            if (body.onTriggerEnter) body.onTriggerEnter(other);
          }
        } else if (other.isStatic) {
          // Resolve collision with static body
          this._resolveStaticCollision(body, other);
        }
      }

      // Clean trigger cache for non-overlapping pairs
      for (const key of this._triggerCache) {
        const parts = key.split('_');
        const bi = parseInt(parts[2]);
        const oi = parseInt(parts[3]);
        if (bi < this.bodies.length && oi < this.bodies.length) {
          if (!this._aabbOverlap(this.bodies[bi], this.bodies[oi])) {
            this._triggerCache.delete(key);
          }
        }
      }

      // Reset acceleration
      body.acceleration.set(0, 0, 0);
    }
  }

  _aabbOverlap(a, b) {
    return (
      a.min.x <= b.max.x && a.max.x >= b.min.x &&
      a.min.y <= b.max.y && a.max.y >= b.min.y &&
      a.min.z <= b.max.z && a.max.z >= b.min.z
    );
  }

  _resolveStaticCollision(dynamic, staticBody) {
    // Calculate overlap on each axis
    const overlapX = Math.min(dynamic.max.x - staticBody.min.x, staticBody.max.x - dynamic.min.x);
    const overlapY = Math.min(dynamic.max.y - staticBody.min.y, staticBody.max.y - dynamic.min.y);
    const overlapZ = Math.min(dynamic.max.z - staticBody.min.z, staticBody.max.z - dynamic.min.z);

    // Resolve on axis with smallest overlap
    if (overlapY <= overlapX && overlapY <= overlapZ) {
      // Y axis
      if (dynamic.position.y > staticBody.position.y) {
        dynamic.position.y = staticBody.max.y + dynamic.halfExtents.y;
        if (dynamic.velocity.y < 0) {
          dynamic.velocity.y = dynamic.bounciness > 0 ? -dynamic.velocity.y * dynamic.bounciness : 0;
          dynamic.isGrounded = true;
        }
      } else {
        dynamic.position.y = staticBody.min.y - dynamic.halfExtents.y;
        if (dynamic.velocity.y > 0) dynamic.velocity.y = 0;
      }
    } else if (overlapX <= overlapZ) {
      // X axis
      if (dynamic.position.x > staticBody.position.x) {
        dynamic.position.x = staticBody.max.x + dynamic.halfExtents.x;
      } else {
        dynamic.position.x = staticBody.min.x - dynamic.halfExtents.x;
      }
      dynamic.velocity.x = 0;
    } else {
      // Z axis
      if (dynamic.position.z > staticBody.position.z) {
        dynamic.position.z = staticBody.max.z + dynamic.halfExtents.z;
      } else {
        dynamic.position.z = staticBody.min.z - dynamic.halfExtents.z;
      }
      dynamic.velocity.z = 0;
    }

    // Fire collision callback
    if (dynamic.onCollision) dynamic.onCollision(staticBody);
    if (staticBody.onCollision) staticBody.onCollision(dynamic);
  }

  /**
   * Raycast against all bodies
   */
  raycast(origin, direction, maxDistance = 100) {
    let closest = null;
    let closestDist = maxDistance;

    for (const body of this.bodies) {
      if (!body.enabled) continue;
      const dist = this._rayAABB(origin, direction, body);
      if (dist !== null && dist < closestDist) {
        closestDist = dist;
        closest = { body, distance: dist, point: origin.clone().add(direction.clone().multiplyScalar(dist)) };
      }
    }
    return closest;
  }

  _rayAABB(origin, dir, body) {
    const invDir = new THREE.Vector3(1 / dir.x, 1 / dir.y, 1 / dir.z);
    const bmin = body.min;
    const bmax = body.max;

    const tx1 = (bmin.x - origin.x) * invDir.x;
    const tx2 = (bmax.x - origin.x) * invDir.x;
    let tmin = Math.min(tx1, tx2);
    let tmax = Math.max(tx1, tx2);

    const ty1 = (bmin.y - origin.y) * invDir.y;
    const ty2 = (bmax.y - origin.y) * invDir.y;
    tmin = Math.max(tmin, Math.min(ty1, ty2));
    tmax = Math.min(tmax, Math.max(ty1, ty2));

    const tz1 = (bmin.z - origin.z) * invDir.z;
    const tz2 = (bmax.z - origin.z) * invDir.z;
    tmin = Math.max(tmin, Math.min(tz1, tz2));
    tmax = Math.min(tmax, Math.max(tz1, tz2));

    if (tmax >= tmin && tmax >= 0) return Math.max(tmin, 0);
    return null;
  }
}
