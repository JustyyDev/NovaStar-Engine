/**
 * NovaStar Editor Application v0.2.2
 * Visual scene editor with template system
 */

import * as THREE from 'three';
import { NovaStarEngine } from '../engine/NovaStarEngine.js';
import { MeshBuilder } from '../engine/MeshBuilder.js';

class EditorApp {
  constructor() {
    this.engine = null;
    this.builder = null;
    this.novaScript = null;
    this.canvas = null;
    this.selectedEntity = null;
    this.entities = [];
    this.currentTool = 'select';
    this.isPlaying = false;
    this.selectionBox = null;

    // Camera orbit
    this.cameraTarget = new THREE.Vector3(0, 0, 0);
    this.cameraDistance = 20;
    this.cameraAngleX = 0.5;
    this.cameraAngleY = 0.8;

    // The template was chosen in the inline script (editor.html)
    // and stored in window.__novastarTemplate
    const template = window.__novastarTemplate || 'blank';
    console.log('[NovaStar] Starting editor with template:', template);
    this._startEditor(template);
  }

  async _startEditor(template) {
    try {
      // Wait a tick for the DOM to settle after welcome screen hides
      await new Promise(r => setTimeout(r, 500));

      this.canvas = document.getElementById('editor-canvas');
      if (!this.canvas) {
        throw new Error('Canvas element not found. Make sure #editor-canvas exists in the HTML.');
      }

      // Force canvas to have size
      const viewport = document.getElementById('viewport');
      if (viewport) {
        const rect = viewport.getBoundingClientRect();
        this.canvas.width = rect.width || 800;
        this.canvas.height = rect.height || 600;
      }

      this.engine = new NovaStarEngine(this.canvas);
      this.builder = new MeshBuilder(this.engine);

    // Load NovaScript interpreter dynamically (non-blocking)
    this.novaScript = null;
    import('../novascript/Interpreter.js').then(mod => {
      try {
        this.novaScript = new mod.Interpreter(this.engine);
        console.log('[NovaStar] NovaScript loaded');
      } catch (e) {
        console.warn('[NovaStar] NovaScript init failed:', e);
      }
    }).catch(e => {
      console.warn('[NovaStar] NovaScript module not available:', e);
    });

    // Setup scene
    const grid = new THREE.GridHelper(40, 40, 0x2a3f5e, 0x1a2a4e);
    this.engine.scene.add(grid);

    const axes = new THREE.AxesHelper(3);
    this.engine.scene.add(axes);

    this.engine.camera.position.set(10, 12, 15);
    this.engine.camera.lookAt(0, 0, 0);
    this.engine.renderer.setSkyColor(0x1a1a2e, 0x0f1a30);

    // Start engine
    this.engine.start();
    this.engine.onUpdate((dt) => this._editorUpdate(dt));
    this.engine.onLateUpdate((dt) => this._updateCamera(dt));

    // Setup UI
    this._setupEventListeners();
    this._setupViewportResize();
    this._updateHierarchy();

    // Load template
    this._loadTemplate(template);

    this._log('NovaStar Editor ready', 'result');
    this._log(`Template: ${template}`, 'log');
    } catch (err) {
      console.error('Editor initialization failed:', err);
      alert('Editor failed to start: ' + err.message + '\n\nCheck the console (F12) for details.');
    }
  }

  // ─── TEMPLATES ─────────────────────────────────
  _loadTemplate(template) {
    switch (template) {
      case 'platformer3d':
        this._templatePlatformer3D();
        break;
      case 'topdown2d':
        this._templateTopDown2D();
        break;
      case 'sidescroller':
        this._templateSideScroller();
        break;
      case 'arena':
        this._templateArena();
        break;
      case 'puzzle':
        this._templatePuzzle();
        break;
      case 'blank':
      default:
        // Just an empty scene
        break;
    }
  }

  _templatePlatformer3D() {
    // Ground
    this.addEntity('platform', { name: 'Ground', x: 0, y: -0.25, z: 0, w: 10, d: 10 });
    // Some platforms
    this.addEntity('platform', { name: 'Platform_1', x: 5, y: 1.5, z: -3, w: 3, d: 3 });
    this.addEntity('platform', { name: 'Platform_2', x: -4, y: 3, z: 2, w: 3, d: 3 });
    this.addEntity('platform', { name: 'Platform_3', x: 0, y: 5, z: -6, w: 4, d: 4 });
    // Player
    this.addEntity('character', { name: 'Player', x: 0, y: 1, z: 0 });
    // Collectibles
    this.addEntity('star', { name: 'Star_1', x: 5, y: 3.5, z: -3 });
    this.addEntity('star', { name: 'Star_2', x: -4, y: 5, z: 2 });
    this.addEntity('star', { name: 'Star_3', x: 0, y: 7, z: -6 });
    // Enemy
    this.addEntity('enemy', { name: 'Slime_1', x: 5, y: 2.5, z: -3 });
    // Trees
    this.addEntity('tree', { name: 'Tree_1', x: -3, y: 0, z: -3 });
    this.addEntity('tree', { name: 'Tree_2', x: 4, y: 0, z: 4 });
    // Spawn
    this.addEntity('spawn', { name: 'SpawnPoint', x: 0, y: 0.5, z: 0 });
  }

  _templateTopDown2D() {
    // Large ground
    this.addEntity('platform', { name: 'Floor', x: 0, y: -0.25, z: 0, w: 20, d: 20 });
    // Player
    this.addEntity('character', { name: 'Player', x: 0, y: 1, z: 0 });
    // Walls as platforms
    for (let i = 0; i < 4; i++) {
      this.addEntity('platform', { name: `Wall_${i+1}`, x: (i < 2 ? -8 : 8), y: 0.5, z: (i % 2 === 0 ? -5 : 5), w: 1, d: 6 });
    }
    // Collectibles scattered
    for (let i = 0; i < 5; i++) {
      this.addEntity('star', { name: `Gem_${i+1}`, x: (Math.random()-0.5)*14, y: 1.5, z: (Math.random()-0.5)*14 });
    }
  }

  _templateSideScroller() {
    // Long ground
    this.addEntity('platform', { name: 'Ground', x: 0, y: -0.25, z: 0, w: 30, d: 4 });
    // Platforms at various heights
    this.addEntity('platform', { name: 'Ledge_1', x: 6, y: 2, z: 0, w: 4, d: 3 });
    this.addEntity('platform', { name: 'Ledge_2', x: 12, y: 4, z: 0, w: 3, d: 3 });
    this.addEntity('platform', { name: 'Ledge_3', x: -5, y: 3, z: 0, w: 3, d: 3 });
    // Player
    this.addEntity('character', { name: 'Player', x: -10, y: 1, z: 0 });
    // Enemies
    this.addEntity('enemy', { name: 'Enemy_1', x: 3, y: 0.5, z: 0 });
    this.addEntity('enemy', { name: 'Enemy_2', x: 10, y: 0.5, z: 0 });
    // Coins
    for (let i = 0; i < 6; i++) {
      this.addEntity('star', { name: `Coin_${i+1}`, x: -8 + i * 4, y: 2, z: 0 });
    }
  }

  _templateArena() {
    // Arena floor (circular approximation)
    this.addEntity('platform', { name: 'Arena', x: 0, y: -0.25, z: 0, w: 16, d: 16 });
    // Player
    this.addEntity('character', { name: 'Player', x: 0, y: 1, z: 0 });
    // Enemies in a circle
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      this.addEntity('enemy', { name: `Enemy_${i+1}`, x: Math.cos(angle) * 6, y: 0.5, z: Math.sin(angle) * 6 });
    }
    // Cover/obstacles
    this.addEntity('platform', { name: 'Cover_1', x: 3, y: 0.5, z: 3, w: 2, d: 2 });
    this.addEntity('platform', { name: 'Cover_2', x: -3, y: 0.5, z: -3, w: 2, d: 2 });
    // Power-ups
    this.addEntity('star', { name: 'PowerUp_1', x: 5, y: 1.5, z: 0 });
    this.addEntity('star', { name: 'PowerUp_2', x: -5, y: 1.5, z: 0 });
    this.addEntity('star', { name: 'PowerUp_3', x: 0, y: 1.5, z: 5 });
  }

  _templatePuzzle() {
    // Grid floor
    this.addEntity('platform', { name: 'Board', x: 0, y: -0.25, z: 0, w: 12, d: 12 });
    // Puzzle pieces as colored platforms
    const colors = [0xa86bff, 0x4da8ff, 0x4ee6a0, 0xffa64d];
    for (let i = 0; i < 4; i++) {
      this.addEntity('platform', { name: `Block_${i+1}`, x: -3 + (i%2)*6, y: 0.5, z: -3 + Math.floor(i/2)*6, w: 2, d: 2, color: colors[i] });
    }
    // Trigger zones
    this.addEntity('trigger', { name: 'Goal_1', x: -3, y: 1, z: -3 });
    this.addEntity('trigger', { name: 'Goal_2', x: 3, y: 1, z: 3 });
    // Player
    this.addEntity('character', { name: 'Player', x: 0, y: 1, z: 0 });
  }

  // ─── VIEWPORT RESIZE ───────────────────────────
  _setupViewportResize() {
    const viewport = document.getElementById('viewport');
    const resize = () => {
      const rect = viewport.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) return;
      this.engine.options.width = rect.width;
      this.engine.options.height = rect.height;
      this.engine.camera.aspect = rect.width / rect.height;
      this.engine.camera.updateProjectionMatrix();
      this.engine.renderer.resize(rect.width, rect.height);
    };
    new ResizeObserver(resize).observe(viewport);
    requestAnimationFrame(resize);
    setTimeout(resize, 200);
  }

  // ─── EVENT LISTENERS ───────────────────────────
  _setupEventListeners() {
    // Tool buttons
    document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTool = btn.dataset.tool;
      });
    });

    // Play/Stop
    document.getElementById('btn-play')?.addEventListener('click', () => this.togglePlay());
    document.getElementById('btn-stop')?.addEventListener('click', () => this.togglePlay());

    // Save/Load/Export
    document.getElementById('btn-save')?.addEventListener('click', () => this.saveScene());
    document.getElementById('btn-load')?.addEventListener('click', () => this.loadScene());
    document.getElementById('btn-export')?.addEventListener('click', () => this.exportScene());

    // Add entity button
    document.getElementById('btn-add-entity')?.addEventListener('click', () => this.addEntity('platform'));

    // Palette buttons
    document.querySelectorAll('.palette-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        this.addEntity(type);
        this._log(`Added ${type}`, 'result');
      });
    });

    // Console toggle
    document.getElementById('console-toggle')?.addEventListener('click', () => {
      document.getElementById('script-console')?.classList.toggle('collapsed');
    });

    // Console input
    const consoleInput = document.getElementById('console-input');
    consoleInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && consoleInput.value.trim()) {
        this.executeConsoleCommand(consoleInput.value);
        consoleInput.value = '';
      }
    });

    // Camera controls
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cameraDistance *= e.deltaY > 0 ? 1.1 : 0.9;
      this.cameraDistance = Math.max(3, Math.min(50, this.cameraDistance));
    }, { passive: false });

    let isDragging = false;
    let lastMouse = { x: 0, y: 0 };

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 1 || e.button === 2) {
        isDragging = true;
        lastMouse = { x: e.clientX, y: e.clientY };
      } else if (e.button === 0 && this.currentTool === 'select') {
        this._handleSelect(e);
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - lastMouse.x;
      const dy = e.clientY - lastMouse.y;
      this.cameraAngleX -= dx * 0.005;
      this.cameraAngleY = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, this.cameraAngleY - dy * 0.005));
      lastMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => { isDragging = false; });

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      switch (e.code) {
        case 'KeyV': document.querySelector('[data-tool="select"]')?.click(); break;
        case 'KeyG': document.querySelector('[data-tool="move"]')?.click(); break;
        case 'KeyR': document.querySelector('[data-tool="rotate"]')?.click(); break;
        case 'KeyS': if (!e.ctrlKey) document.querySelector('[data-tool="scale"]')?.click(); break;
        case 'F5': e.preventDefault(); this.togglePlay(); break;
        case 'Delete': case 'Backspace': this.deleteSelected(); break;
      }
    });
  }

  // ─── RAYCASTER ─────────────────────────────────
  _handleSelect(event) {
    const rect = this.canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.engine.camera);
    const meshes = this.entities.map(e => e.mesh).filter(Boolean);
    const intersects = raycaster.intersectObjects(meshes, true);

    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj.parent && !obj.userData._editorEntity) obj = obj.parent;
      if (obj.userData._editorEntity) {
        this.selectEntity(obj.userData._editorEntity);
        return;
      }
    }
    this.selectEntity(null);
  }

  // ─── ENTITY MANAGEMENT ─────────────────────────
  addEntity(type, opts = {}) {
    let mesh, name;

    try {
      switch (type) {
        case 'platform':
          mesh = this.builder.platform({ width: opts.w || 4, depth: opts.d || 4, color: opts.color || 0x66bb55 });
          name = opts.name || 'Platform';
          break;
        case 'character':
          mesh = this.builder.character({ color: 0x4499ff });
          name = opts.name || 'Player';
          break;
        case 'star':
          mesh = this.builder.collectible({ color: 0xffdd44, size: 0.35 });
          name = opts.name || 'Star';
          break;
        case 'tree':
          mesh = this.builder.tree({});
          name = opts.name || 'Tree';
          break;
        case 'enemy':
          mesh = this.builder.enemy({ color: 0xdd4444, size: 0.5 });
          name = opts.name || 'Enemy';
          break;
        case 'light':
          mesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffee88, wireframe: true }));
          name = opts.name || 'Light';
          break;
        case 'spawn':
          mesh = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 6), new THREE.MeshBasicMaterial({ color: 0x4ee6a0, wireframe: true }));
          name = opts.name || 'Spawn';
          break;
        case 'trigger':
          mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial({ color: 0x4da8ff, wireframe: true, transparent: true, opacity: 0.3 }));
          name = opts.name || 'Trigger';
          break;
        default:
          mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xaaaaaa }));
          name = opts.name || 'Entity';
      }
    } catch (err) {
      console.error(`Failed to create ${type}:`, err);
      mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xff00ff }));
      name = opts.name || 'Error';
    }

    mesh.position.set(
      opts.x ?? (Math.random() - 0.5) * 4,
      opts.y ?? (type === 'platform' ? 0 : 1),
      opts.z ?? (Math.random() - 0.5) * 4
    );

    const entity = {
      id: this.entities.length + 1,
      name: `${name}_${this.entities.length + 1}`,
      type, mesh,
      get position() { return mesh.position; },
      get rotation() { return mesh.rotation; },
      get scale() { return mesh.scale; },
    };

    mesh.userData._editorEntity = entity;
    this.engine.scene.add(mesh);
    this.entities.push(entity);
    this._updateHierarchy();
    return entity;
  }

  deleteSelected() {
    if (!this.selectedEntity) return;
    this.engine.scene.remove(this.selectedEntity.mesh);
    if (this.selectionBox) { this.engine.scene.remove(this.selectionBox); this.selectionBox = null; }
    this.entities = this.entities.filter(e => e !== this.selectedEntity);
    this._log(`Deleted ${this.selectedEntity.name}`, 'log');
    this.selectedEntity = null;
    this._updateHierarchy();
    this._updateInspector();
  }

  selectEntity(entity) {
    if (this.selectionBox) { this.engine.scene.remove(this.selectionBox); this.selectionBox = null; }
    this.selectedEntity = entity;
    if (entity && entity.mesh) {
      this.selectionBox = new THREE.BoxHelper(entity.mesh, 0x4ee6a0);
      this.engine.scene.add(this.selectionBox);
    }
    this._updateHierarchy();
    this._updateInspector();
  }

  // ─── UI UPDATES ────────────────────────────────
  _getTypeIcon(type) {
    const icons = {
      platform: '<svg viewBox="0 0 14 14" fill="none"><rect x="1" y="8" width="12" height="4" rx="1" fill="#4ee6a0"/></svg>',
      character: '<svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="5" r="3" fill="#4da8ff"/><rect x="5" y="8" width="4" height="4" rx="1.5" fill="#4da8ff"/></svg>',
      star: '<svg viewBox="0 0 14 14" fill="none"><polygon points="7,1 8.5,5 13,5 9.5,8 11,12 7,9.5 3,12 4.5,8 1,5 5.5,5" fill="#ffe066"/></svg>',
      tree: '<svg viewBox="0 0 14 14" fill="none"><rect x="6" y="10" width="2" height="3" fill="#8b7355"/><polygon points="7,2 3,10 11,10" fill="#4ee6a0"/></svg>',
      enemy: '<svg viewBox="0 0 14 14" fill="none"><ellipse cx="7" cy="9" rx="5" ry="3.5" fill="#ff5568"/><circle cx="5.5" cy="8" r="1" fill="white"/><circle cx="8.5" cy="8" r="1" fill="white"/></svg>',
      light: '<svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="6" r="3" fill="#ffe066"/></svg>',
      spawn: '<svg viewBox="0 0 14 14" fill="none"><polygon points="7,2 5,9 9,9" fill="#4ee6a0"/></svg>',
      trigger: '<svg viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="10" height="10" rx="2" stroke="#4da8ff" stroke-width="1" fill="none" stroke-dasharray="2 1.5"/></svg>',
    };
    return icons[type] || '<svg viewBox="0 0 14 14" fill="none"><rect x="3" y="3" width="8" height="8" rx="1" fill="#6b7394"/></svg>';
  }

  _updateHierarchy() {
    const tree = document.getElementById('hierarchy-tree');
    if (!tree) return;
    tree.innerHTML = '';
    this.entities.forEach(entity => {
      const item = document.createElement('div');
      item.className = 'hierarchy-item' + (entity === this.selectedEntity ? ' selected' : '');
      item.innerHTML = `${this._getTypeIcon(entity.type)} <span>${entity.name}</span>`;
      item.addEventListener('click', () => this.selectEntity(entity));
      tree.appendChild(item);
    });
    const counter = document.getElementById('entity-count');
    if (counter) counter.textContent = `${this.entities.length} entities`;
  }

  _updateInspector() {
    const content = document.getElementById('inspector-content');
    if (!content) return;

    if (!this.selectedEntity) {
      content.innerHTML = '<p class="hint">Select an entity to inspect its properties</p>';
      return;
    }

    const e = this.selectedEntity;
    content.innerHTML = `
      <div class="inspector-section">
        <div class="inspector-section-title">Identity</div>
        <div class="inspector-row"><label>N</label><input type="text" value="${e.name}" data-prop="name"></div>
        <div class="inspector-row"><label>T</label><input type="text" value="${e.type}" disabled style="opacity:0.5"></div>
      </div>
      <div class="inspector-section">
        <div class="inspector-section-title">Position</div>
        <div class="inspector-row"><label style="color:#ff5568">X</label><input type="number" step="0.1" value="${e.position.x.toFixed(2)}" data-prop="px"></div>
        <div class="inspector-row"><label style="color:#4ee6a0">Y</label><input type="number" step="0.1" value="${e.position.y.toFixed(2)}" data-prop="py"></div>
        <div class="inspector-row"><label style="color:#4da8ff">Z</label><input type="number" step="0.1" value="${e.position.z.toFixed(2)}" data-prop="pz"></div>
      </div>
      <div class="inspector-section">
        <div class="inspector-section-title">Rotation (degrees)</div>
        <div class="inspector-row"><label style="color:#ff5568">X</label><input type="number" step="1" value="${THREE.MathUtils.radToDeg(e.rotation.x).toFixed(0)}" data-prop="rx"></div>
        <div class="inspector-row"><label style="color:#4ee6a0">Y</label><input type="number" step="1" value="${THREE.MathUtils.radToDeg(e.rotation.y).toFixed(0)}" data-prop="ry"></div>
        <div class="inspector-row"><label style="color:#4da8ff">Z</label><input type="number" step="1" value="${THREE.MathUtils.radToDeg(e.rotation.z).toFixed(0)}" data-prop="rz"></div>
      </div>
      <div class="inspector-section">
        <div class="inspector-section-title">Scale</div>
        <div class="inspector-row"><label style="color:#ff5568">X</label><input type="number" step="0.1" value="${e.scale.x.toFixed(2)}" data-prop="sx"></div>
        <div class="inspector-row"><label style="color:#4ee6a0">Y</label><input type="number" step="0.1" value="${e.scale.y.toFixed(2)}" data-prop="sy"></div>
        <div class="inspector-row"><label style="color:#4da8ff">Z</label><input type="number" step="0.1" value="${e.scale.z.toFixed(2)}" data-prop="sz"></div>
      </div>
    `;

    content.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', () => {
        const prop = input.dataset.prop;
        const val = prop === 'name' ? input.value : parseFloat(input.value);
        if (prop === 'name') { e.name = val; this._updateHierarchy(); return; }
        if (prop === 'px') e.mesh.position.x = val;
        if (prop === 'py') e.mesh.position.y = val;
        if (prop === 'pz') e.mesh.position.z = val;
        if (prop === 'rx') e.mesh.rotation.x = THREE.MathUtils.degToRad(val);
        if (prop === 'ry') e.mesh.rotation.y = THREE.MathUtils.degToRad(val);
        if (prop === 'rz') e.mesh.rotation.z = THREE.MathUtils.degToRad(val);
        if (prop === 'sx') e.mesh.scale.x = val;
        if (prop === 'sy') e.mesh.scale.y = val;
        if (prop === 'sz') e.mesh.scale.z = val;
      });
    });
  }

  // ─── UPDATE LOOPS ──────────────────────────────
  _editorUpdate(dt) {
    if (this.selectionBox && this.selectedEntity) this.selectionBox.update();
    const fpsEl = document.getElementById('fps-counter');
    if (fpsEl) fpsEl.textContent = `${this.engine.fps} FPS`;
  }

  _updateCamera(dt) {
    const x = this.cameraDistance * Math.sin(this.cameraAngleY) * Math.sin(this.cameraAngleX);
    const y = this.cameraDistance * Math.cos(this.cameraAngleY);
    const z = this.cameraDistance * Math.sin(this.cameraAngleY) * Math.cos(this.cameraAngleX);
    this.engine.camera.position.set(this.cameraTarget.x + x, this.cameraTarget.y + y, this.cameraTarget.z + z);
    this.engine.camera.lookAt(this.cameraTarget);
  }

  // ─── CONSOLE ───────────────────────────────────
  executeConsoleCommand(code) {
    this._log(`> ${code}`, 'log');
    try {
      if (this.novaScript) {
        const result = this.novaScript.execute(code);
        if (result !== null && result !== undefined) this._log(String(result), 'result');
      } else {
        // Fallback: run as JS with engine context
        const fn = new Function('engine', 'THREE', code);
        const result = fn(this.engine, THREE);
        if (result !== undefined) this._log(String(result), 'result');
      }
    } catch (err) {
      this._log(err.message, 'error');
    }
  }

  _log(text, type = 'log') {
    const output = document.getElementById('console-output');
    if (!output) return;
    const line = document.createElement('div');
    line.className = type;
    line.textContent = text;
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
  }

  // ─── PLAY / STOP ───────────────────────────────
  togglePlay() {
    this.isPlaying = !this.isPlaying;
    const playBtn = document.getElementById('btn-play');
    const stopBtn = document.getElementById('btn-stop');
    if (playBtn) playBtn.style.display = this.isPlaying ? 'none' : '';
    if (stopBtn) stopBtn.style.display = this.isPlaying ? '' : 'none';
    this._log(this.isPlaying ? 'Play mode' : 'Edit mode', 'result');
  }

  // ─── SAVE / LOAD ──────────────────────────────
  saveScene() {
    const data = {
      version: '0.1', entities: this.entities.map(e => ({
        name: e.name, type: e.type,
        position: { x: e.position.x, y: e.position.y, z: e.position.z },
        rotation: { x: e.rotation.x, y: e.rotation.y, z: e.rotation.z },
        scale: { x: e.scale.x, y: e.scale.y, z: e.scale.z },
      }))
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'scene.novastar';
    a.click();
    URL.revokeObjectURL(a.href);
    this._log('Scene saved', 'result');
  }

  loadScene() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.novastar,.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        // Clear current
        this.entities.forEach(ent => this.engine.scene.remove(ent.mesh));
        this.entities = [];
        this.selectedEntity = null;
        if (this.selectionBox) { this.engine.scene.remove(this.selectionBox); this.selectionBox = null; }
        // Rebuild
        for (const ed of data.entities) {
          const ent = this.addEntity(ed.type, { name: ed.name, x: ed.position.x, y: ed.position.y, z: ed.position.z });
          ent.mesh.rotation.set(ed.rotation.x, ed.rotation.y, ed.rotation.z);
          ent.mesh.scale.set(ed.scale.x, ed.scale.y, ed.scale.z);
        }
        this._updateHierarchy();
        this._log(`Loaded ${data.entities.length} entities`, 'result');
      } catch (err) {
        this._log(`Load failed: ${err.message}`, 'error');
      }
    };
    input.click();
  }

  exportScene() {
    this._log('Export: Coming in v0.2!', 'log');
  }
}

// Boot - wait for template selection from the inline script in editor.html
function boot() {
  try {
    // Check if template was already chosen
    if (window.__novastarTemplate) {
      const app = new EditorApp();
      window.editor = app;
      return;
    }

    // Otherwise poll until it's set (user clicks a template card)
    const check = setInterval(() => {
      if (window.__novastarTemplate) {
        clearInterval(check);
        try {
          const app = new EditorApp();
          window.editor = app;
        } catch (e) {
          console.error('[NovaStar] Editor creation failed:', e);
          alert('Editor failed to start: ' + e.message);
        }
      }
    }, 100);
  } catch (e) {
    console.error('[NovaStar] Boot failed:', e);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
