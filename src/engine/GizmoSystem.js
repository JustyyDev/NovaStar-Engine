/**
 * NovaStar Gizmo System
 * Visual transform handles for the editor (move, rotate, scale)
 */

import * as THREE from 'three';

export class GizmoSystem {
  constructor(engine, camera) {
    this.engine = engine;
    this.camera = camera;
    this.mode = 'move'; // 'move', 'rotate', 'scale'
    this.target = null;
    this.group = new THREE.Group();
    this.group.name = '__gizmo__';
    this.visible = false;
    this._dragging = false;
    this._activeAxis = null;
    this._dragStart = new THREE.Vector3();
    this._dragPlane = new THREE.Plane();
    this._raycaster = new THREE.Raycaster();

    this._buildGizmos();
    engine.scene.add(this.group);
    this.group.visible = false;
  }

  _buildGizmos() {
    // Axis colors
    this.colors = {
      x: 0xff4455, xHover: 0xff8899,
      y: 0x44ee88, yHover: 0x88ffbb,
      z: 0x4488ff, zHover: 0x88bbff,
    };

    // Move gizmo arrows
    this.moveGroup = new THREE.Group();
    this.moveGroup.name = 'move';
    ['x', 'y', 'z'].forEach(axis => {
      const dir = new THREE.Vector3();
      dir[axis] = 1;

      // Shaft
      const shaftGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6);
      const shaftMat = new THREE.MeshBasicMaterial({ color: this.colors[axis], depthTest: false, transparent: true, opacity: 0.9 });
      const shaft = new THREE.Mesh(shaftGeo, shaftMat);
      shaft.position.copy(dir.clone().multiplyScalar(0.75));
      shaft.renderOrder = 999;

      // Cone tip
      const coneGeo = new THREE.ConeGeometry(0.1, 0.3, 8);
      const coneMat = new THREE.MeshBasicMaterial({ color: this.colors[axis], depthTest: false, transparent: true, opacity: 0.9 });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.copy(dir.clone().multiplyScalar(1.6));
      cone.renderOrder = 999;

      // Rotate to align with axis
      if (axis === 'x') { shaft.rotation.z = -Math.PI / 2; cone.rotation.z = -Math.PI / 2; }
      if (axis === 'z') { shaft.rotation.x = Math.PI / 2; cone.rotation.x = Math.PI / 2; }

      const axisGroup = new THREE.Group();
      axisGroup.name = `move_${axis}`;
      axisGroup.userData.axis = axis;
      axisGroup.userData.type = 'move';
      axisGroup.add(shaft, cone);
      this.moveGroup.add(axisGroup);
    });
    this.group.add(this.moveGroup);

    // Scale gizmo (cubes at ends)
    this.scaleGroup = new THREE.Group();
    this.scaleGroup.name = 'scale';
    this.scaleGroup.visible = false;
    ['x', 'y', 'z'].forEach(axis => {
      const dir = new THREE.Vector3();
      dir[axis] = 1;

      const shaftGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6);
      const shaftMat = new THREE.MeshBasicMaterial({ color: this.colors[axis], depthTest: false, transparent: true, opacity: 0.9 });
      const shaft = new THREE.Mesh(shaftGeo, shaftMat);
      shaft.position.copy(dir.clone().multiplyScalar(0.6));
      shaft.renderOrder = 999;

      const cubeGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
      const cubeMat = new THREE.MeshBasicMaterial({ color: this.colors[axis], depthTest: false, transparent: true, opacity: 0.9 });
      const cube = new THREE.Mesh(cubeGeo, cubeMat);
      cube.position.copy(dir.clone().multiplyScalar(1.3));
      cube.renderOrder = 999;

      if (axis === 'x') shaft.rotation.z = -Math.PI / 2;
      if (axis === 'z') shaft.rotation.x = Math.PI / 2;

      const axisGroup = new THREE.Group();
      axisGroup.name = `scale_${axis}`;
      axisGroup.userData.axis = axis;
      axisGroup.userData.type = 'scale';
      axisGroup.add(shaft, cube);
      this.scaleGroup.add(axisGroup);
    });
    this.group.add(this.scaleGroup);

    // Rotate gizmo (rings)
    this.rotateGroup = new THREE.Group();
    this.rotateGroup.name = 'rotate';
    this.rotateGroup.visible = false;
    ['x', 'y', 'z'].forEach(axis => {
      const ringGeo = new THREE.TorusGeometry(1.2, 0.025, 8, 48);
      const ringMat = new THREE.MeshBasicMaterial({ color: this.colors[axis], depthTest: false, transparent: true, opacity: 0.8 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.renderOrder = 999;

      if (axis === 'x') ring.rotation.y = Math.PI / 2;
      if (axis === 'z') ring.rotation.x = 0; // Already in XY plane
      if (axis === 'y') ring.rotation.x = Math.PI / 2;

      const axisGroup = new THREE.Group();
      axisGroup.name = `rotate_${axis}`;
      axisGroup.userData.axis = axis;
      axisGroup.userData.type = 'rotate';
      axisGroup.add(ring);
      this.rotateGroup.add(axisGroup);
    });
    this.group.add(this.rotateGroup);
  }

  setMode(mode) {
    this.mode = mode;
    this.moveGroup.visible = mode === 'move';
    this.scaleGroup.visible = mode === 'scale';
    this.rotateGroup.visible = mode === 'rotate';
  }

  attach(mesh) {
    this.target = mesh;
    this.group.visible = true;
    this.visible = true;
    this._updatePosition();
  }

  detach() {
    this.target = null;
    this.group.visible = false;
    this.visible = false;
  }

  _updatePosition() {
    if (!this.target) return;
    this.group.position.copy(this.target.position);

    // Scale gizmo based on camera distance so it stays consistent size
    const dist = this.camera.position.distanceTo(this.target.position);
    const scale = dist * 0.08;
    this.group.scale.setScalar(Math.max(0.5, Math.min(3, scale)));
  }

  update() {
    if (this.target && this.visible) {
      this._updatePosition();
    }
  }

  /**
   * Check if a mouse event intersects a gizmo handle
   * Returns { axis, type } or null
   */
  intersect(mouse, camera) {
    if (!this.visible) return null;

    this._raycaster.setFromCamera(mouse, camera);
    const activeGroup = this.mode === 'move' ? this.moveGroup
      : this.mode === 'scale' ? this.scaleGroup : this.rotateGroup;

    const intersects = this._raycaster.intersectObjects(activeGroup.children, true);
    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj && !obj.userData.axis) obj = obj.parent;
      if (obj && obj.userData.axis) {
        return { axis: obj.userData.axis, type: obj.userData.type };
      }
    }
    return null;
  }

  /**
   * Begin dragging on an axis
   */
  startDrag(axis, mouse, camera) {
    if (!this.target) return;
    this._dragging = true;
    this._activeAxis = axis;
    this._dragStart.copy(this.target.position);
  }

  /**
   * Apply drag movement
   */
  drag(delta, axis) {
    if (!this._dragging || !this.target) return;

    if (this.mode === 'move') {
      this.target.position[axis] += delta;
    } else if (this.mode === 'scale') {
      this.target.scale[axis] = Math.max(0.1, this.target.scale[axis] + delta * 0.5);
    } else if (this.mode === 'rotate') {
      this.target.rotation[axis] += delta * 2;
    }
  }

  endDrag() {
    this._dragging = false;
    this._activeAxis = null;
  }

  get isDragging() { return this._dragging; }
  get activeAxis() { return this._activeAxis; }
}
