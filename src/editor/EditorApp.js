/**
 * NovaStar Editor Application v0.5.0
 * ═══════════════════════════════════
 * Complete rewrite: clean, readable, modular.
 * No prompt() calls — uses custom modal dialogs.
 * 10 game templates, proper export dialog, material editor.
 */

import * as THREE from 'three';
import { NovaStarEngine } from '../engine/NovaStarEngine.js';
import { MeshBuilder } from '../engine/MeshBuilder.js';
import { ProjectManager, Prefab } from '../engine/PrefabSystem.js';
import { ModelBuilder } from '../engine/ModelBuilder.js';
import { MaterialSystem, MaterialPresets } from '../engine/MaterialSystem.js';

class EditorApp {
  constructor() {
    this.engine = null;
    this.builder = null;
    this.modeler = null;
    this.novaScript = null;
    this.canvas = null;
    this.selectedEntity = null;
    this.entities = [];
    this.currentTool = 'select';
    this.isPlaying = false;
    this.selectionBox = null;
    this.project = new ProjectManager();
    this.cameraTarget = new THREE.Vector3(0, 0, 0);
    this.cameraDistance = 20;
    this.cameraAngleX = 0.5;
    this.cameraAngleY = 0.8;
    this._startEditor(window.__novastarTemplate || 'blank');
  }

  // ═══════════════════════════════════════════════
  //  INIT
  // ═══════════════════════════════════════════════

  async _startEditor(template) {
    try {
      await new Promise(r => setTimeout(r, 500));
      this.canvas = document.getElementById('editor-canvas');
      if (!this.canvas) throw new Error('Canvas not found');
      const vp = document.getElementById('viewport');
      if (vp) {
        const r = vp.getBoundingClientRect();
        this.canvas.width = r.width || 800;
        this.canvas.height = r.height || 600;
      }
      this.engine = new NovaStarEngine(this.canvas);
      this.builder = new MeshBuilder(this.engine);
      this.modeler = new ModelBuilder(this.engine);
      import('../novascript/Interpreter.js')
        .then(m => { try { this.novaScript = new m.Interpreter(this.engine); } catch (e) {} })
        .catch(() => {});

      this.engine.scene.add(new THREE.GridHelper(40, 40, 0x2a3f5e, 0x1a2a4e));
      this.engine.scene.add(new THREE.AxesHelper(3));
      this.engine.camera.position.set(10, 12, 15);
      this.engine.camera.lookAt(0, 0, 0);
      this.engine.renderer.setSkyColor(0x1a1a2e, 0x0f1a30);
      this.engine.start();
      this.engine.onUpdate(dt => this._editorUpdate(dt));
      this.engine.onLateUpdate(() => this._updateCamera());
      this._setupEventListeners();
      this._setupViewportResize();
      this.project.config.name = template === 'blank' ? 'Untitled' : template;
      this._loadTemplatePrefabs(template);
      this._loadTemplate(template);
      this._updateHierarchy();
      this._updateStatusBar();
      this._log('NovaStar Editor v0.5.0 ready', 'result');
    } catch (err) {
      console.error('Editor init failed:', err);
    }
  }

  // ═══════════════════════════════════════════════
  //  MODAL DIALOGS (replaces prompt())
  // ═══════════════════════════════════════════════

  _showInputDialog(title, defaultValue = '') {
    return new Promise(resolve => {
      const ov = document.createElement('div');
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
      const box = document.createElement('div');
      box.style.cssText = 'background:#1e2330;border:1px solid #2a3040;border-radius:12px;padding:24px;width:360px;max-width:90vw;box-shadow:0 16px 48px rgba(0,0,0,.5);';
      box.innerHTML = '<div style="font-size:15px;font-weight:800;margin-bottom:14px;color:#d4d8e4">' + title + '</div>'
        + '<input type="text" value="' + defaultValue + '" style="width:100%;padding:10px 14px;border-radius:8px;background:#0a0c10;border:1px solid #2a3040;color:#d4d8e4;font-size:14px;outline:none;" id="_nd_inp">'
        + '<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">'
        + '<button id="_nd_x" style="padding:8px 20px;border-radius:8px;background:#181c26;border:1px solid #2a3040;color:#7b84a0;cursor:pointer;font-size:13px;font-weight:700">Cancel</button>'
        + '<button id="_nd_ok" style="padding:8px 20px;border-radius:8px;background:#4ee6a0;border:none;color:#0a0c10;cursor:pointer;font-size:13px;font-weight:800">OK</button></div>';
      ov.appendChild(box);
      document.body.appendChild(ov);
      const inp = document.getElementById('_nd_inp');
      inp.focus(); inp.select();
      const done = v => { ov.remove(); resolve(v); };
      document.getElementById('_nd_ok').onclick = () => done(inp.value);
      document.getElementById('_nd_x').onclick = () => done(null);
      inp.onkeydown = e => { if (e.key === 'Enter') done(inp.value); if (e.key === 'Escape') done(null); };
      ov.onclick = e => { if (e.target === ov) done(null); };
    });
  }

  _showExportDialog() {
    return new Promise(resolve => {
      const ov = document.createElement('div');
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
      const isDesktop = !!window.novastarDesktop;
      const box = document.createElement('div');
      box.style.cssText = 'background:#1e2330;border:1px solid #2a3040;border-radius:12px;padding:28px;width:420px;max-width:90vw;box-shadow:0 16px 48px rgba(0,0,0,.5);';
      box.innerHTML = '<div style="font-size:18px;font-weight:800;margin-bottom:4px;color:#d4d8e4">Export Game</div>'
        + '<div style="font-size:12px;color:#7b84a0;margin-bottom:20px">Choose your export format</div>'
        + '<div style="display:flex;flex-direction:column;gap:10px">'
        + '<button id="_ex_web" style="padding:16px 20px;border-radius:10px;background:#181c26;border:1px solid #2a3040;color:#d4d8e4;cursor:pointer;text-align:left;transition:border-color .12s">'
        +   '<div style="font-size:14px;font-weight:800;color:#4ee6a0;margin-bottom:4px">Web (HTML)</div>'
        +   '<div style="font-size:11px;color:#7b84a0">Single HTML file. Runs in any browser.</div></button>'
        + '<button id="_ex_exe" style="padding:16px 20px;border-radius:10px;background:#181c26;border:1px solid #2a3040;color:#d4d8e4;cursor:pointer;text-align:left;transition:border-color .12s;' + (isDesktop ? '' : 'opacity:.4;') + '">'
        +   '<div style="font-size:14px;font-weight:800;color:#4da8ff;margin-bottom:4px">Desktop (.exe)</div>'
        +   '<div style="font-size:11px;color:#7b84a0">' + (isDesktop ? 'Creates folder with build scripts. Run build-exe.bat for .exe.' : 'Desktop app only.') + '</div></button>'
        + '</div>'
        + '<button id="_ex_x" style="margin-top:14px;width:100%;padding:8px;border-radius:8px;background:none;border:1px solid #2a3040;color:#7b84a0;cursor:pointer;font-size:12px;font-weight:700">Cancel</button>';
      ov.appendChild(box);
      document.body.appendChild(ov);
      const done = v => { ov.remove(); resolve(v); };
      document.getElementById('_ex_web').onclick = () => done('web');
      document.getElementById('_ex_exe').onclick = () => { if (isDesktop) done('desktop'); };
      document.getElementById('_ex_x').onclick = () => done(null);
      ov.onclick = e => { if (e.target === ov) done(null); };
    });
  }

  // ═══════════════════════════════════════════════
  //  TEMPLATES (10 game types)
  // ═══════════════════════════════════════════════

  _loadTemplate(t) {
    const T = {
      platformer3d: '_tPlatformer', topdown2d: '_tTopDown', sidescroller: '_tSideScroller',
      arena: '_tArena', puzzle: '_tPuzzle', horror: '_tHorror',
      racing: '_tRacing', sandbox: '_tSandbox', 'tower-defense': '_tTowerDefense', rpg: '_tRPG',
    };
    if (T[t]) this[T[t]]();
  }

  _loadTemplatePrefabs(t) {
    if (t === 'blank') return;
    this.project.prefabs.add(new Prefab({ name: 'Player Character', category: 'character', components: [{ type: 'ToonMesh', color: '#4499ff' }, { type: 'PhysicsBody', gravity: -25, tag: 'player' }, { type: 'InputController', speed: 5, jumpForce: 12 }], tags: ['player'] }));
    if (['platformer3d', 'sidescroller', 'arena', 'sandbox', 'rpg'].includes(t)) {
      this.project.prefabs.add(new Prefab({ name: 'Collectible Star', category: 'item', components: [{ type: 'ToonMesh', shape: 'star', color: '#ffdd44' }, { type: 'PhysicsBody', isStatic: true, isTrigger: true, tag: 'coin' }], tags: ['coin'] }));
      this.project.prefabs.add(new Prefab({ name: 'Slime Enemy', category: 'enemy', components: [{ type: 'ToonMesh', color: '#dd4444' }, { type: 'PhysicsBody', gravity: -25, tag: 'enemy' }, { type: 'PatrolAI', speed: 2 }, { type: 'Health', maxHP: 3 }], tags: ['enemy'] }));
      this.project.prefabs.add(new Prefab({ name: 'Moving Platform', category: 'environment', components: [{ type: 'ToonMesh', color: '#66bb55' }, { type: 'PhysicsBody', isStatic: true, tag: 'ground' }, { type: 'WaypointMover', speed: 2 }], tags: ['ground'] }));
    }
    if (t === 'horror') {
      this.project.prefabs.add(new Prefab({ name: 'Animatronic', category: 'enemy', components: [{ type: 'PBRMesh', color: '#444466', metalness: 0.3 }, { type: 'StateMachine' }, { type: 'PatrolAI', speed: 1.5 }], tags: ['enemy', 'animatronic'] }));
    }
    this._updatePrefabPanel();
  }

  _tPlatformer() {
    this.addEntity('platform', { name: 'Ground', x: 0, y: -0.25, z: 0, w: 10, d: 10 });
    this.addEntity('platform', { name: 'Platform_1', x: 5, y: 1.5, z: -3, w: 3, d: 3 });
    this.addEntity('platform', { name: 'Platform_2', x: -4, y: 3, z: 2, w: 3, d: 3 });
    this.addEntity('platform', { name: 'Platform_3', x: 0, y: 5, z: -6, w: 2, d: 2 });
    this.addEntity('character', { name: 'Player', x: 0, y: 1, z: 0 });
    this.addEntity('star', { name: 'Star_1', x: 5, y: 3.5, z: -3 });
    this.addEntity('star', { name: 'Star_2', x: -4, y: 5, z: 2 });
    this.addEntity('enemy', { name: 'Slime_1', x: 5, y: 2.5, z: -3 });
    this.addEntity('tree', { name: 'Tree_1', x: -3, y: 0, z: -3 });
    this.addEntity('tree', { name: 'Tree_2', x: 4, y: 0, z: 4 });
    this.addEntity('spawn', { name: 'SpawnPoint', x: 0, y: 0.5, z: 0 });
  }

  _tTopDown() {
    this.addEntity('platform', { name: 'Floor', x: 0, y: -0.25, z: 0, w: 20, d: 20 });
    this.addEntity('character', { name: 'Player', x: 0, y: 1, z: 0 });
    for (let i = 0; i < 4; i++) this.addEntity('platform', { name: 'Wall_' + (i + 1), x: i < 2 ? -8 : 8, y: 0.5, z: i % 2 === 0 ? -5 : 5, w: 1, d: 6 });
    for (let i = 0; i < 5; i++) this.addEntity('star', { name: 'Gem_' + (i + 1), x: (Math.random() - 0.5) * 14, y: 1.5, z: (Math.random() - 0.5) * 14 });
  }

  _tSideScroller() {
    this.addEntity('platform', { name: 'Ground', x: 0, y: -0.25, z: 0, w: 30, d: 4 });
    this.addEntity('platform', { name: 'Ledge_1', x: 6, y: 2, z: 0, w: 4, d: 4 });
    this.addEntity('platform', { name: 'Ledge_2', x: 14, y: 4, z: 0, w: 3, d: 4 });
    this.addEntity('character', { name: 'Player', x: -10, y: 1, z: 0 });
    this.addEntity('enemy', { name: 'Enemy_1', x: 3, y: 0.5, z: 0 });
    for (let i = 0; i < 8; i++) this.addEntity('star', { name: 'Coin_' + (i + 1), x: -8 + i * 3, y: 1.5 + (i % 3), z: 0 });
  }

  _tArena() {
    this.addEntity('platform', { name: 'Arena', x: 0, y: -0.25, z: 0, w: 16, d: 16 });
    this.addEntity('character', { name: 'Player', x: 0, y: 1, z: 0 });
    this.addEntity('platform', { name: 'Cover_1', x: -3, y: 0.75, z: -3, w: 4, d: 0.5 });
    this.addEntity('platform', { name: 'Cover_2', x: 3, y: 0.75, z: 3, w: 0.5, d: 4 });
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; this.addEntity('enemy', { name: 'Enemy_' + (i + 1), x: Math.cos(a) * 6, y: 0.5, z: Math.sin(a) * 6 }); }
    this.addEntity('star', { name: 'PowerUp_1', x: 5, y: 1.5, z: 0 });
  }

  _tPuzzle() {
    this.addEntity('platform', { name: 'Board', x: 0, y: -0.25, z: 0, w: 12, d: 12 });
    this.addEntity('trigger', { name: 'Goal', x: -4, y: 1, z: -4 });
    this.addEntity('trigger', { name: 'Switch_1', x: 3, y: 0.5, z: 3 });
    this.addEntity('trigger', { name: 'Switch_2', x: -3, y: 0.5, z: 3 });
    this.addEntity('platform', { name: 'Block_1', x: 2, y: 0.5, z: 0, w: 1, d: 1 });
    this.addEntity('character', { name: 'Player', x: 0, y: 1, z: 4 });
  }

  _tHorror() {
    this.addEntity('platform', { name: 'Floor', x: 0, y: -0.25, z: 0, w: 8, d: 8, color: 0x1a1a22 });
    this.addEntity('platform', { name: 'BackWall', x: 0, y: 1.5, z: -4, w: 8, d: 0.2 });
    this.addEntity('platform', { name: 'LeftWall', x: -4, y: 1.5, z: 0, w: 0.2, d: 8 });
    this.addEntity('platform', { name: 'RightWall', x: 4, y: 1.5, z: 0, w: 0.2, d: 8 });
    this.addEntity('camera', { name: 'PlayerCamera', x: 0, y: 1.6, z: 2 });
    this.addEntity('enemy', { name: 'Animatronic_1', x: -3, y: 0.5, z: -3 });
    this.addEntity('enemy', { name: 'Animatronic_2', x: 3, y: 0.5, z: -3 });
    this.addEntity('light', { name: 'DeskLamp', x: 0, y: 2.2, z: -0.5 });
    this.addEntity('trigger', { name: 'LeftDoor', x: -3.5, y: 1, z: 0 });
    this.addEntity('trigger', { name: 'RightDoor', x: 3.5, y: 1, z: 0 });
    this.engine.renderer.setSkyColor(0x050508, 0x020204);
  }

  _tRacing() {
    this.addEntity('platform', { name: 'Track_1', x: 0, y: -0.25, z: 0, w: 20, d: 6 });
    this.addEntity('platform', { name: 'Track_2', x: 0, y: -0.25, z: -14, w: 20, d: 6 });
    this.addEntity('platform', { name: 'Track_L', x: -10, y: -0.25, z: -7, w: 6, d: 14 });
    this.addEntity('platform', { name: 'Track_R', x: 10, y: -0.25, z: -7, w: 6, d: 14 });
    this.addEntity('character', { name: 'Racer', x: -5, y: 1, z: 0 });
    this.addEntity('spawn', { name: 'StartLine', x: 0, y: 0.5, z: 0 });
    this.addEntity('trigger', { name: 'Checkpoint_1', x: 10, y: 1, z: -7 });
    this.addEntity('trigger', { name: 'Checkpoint_2', x: 0, y: 1, z: -14 });
    this.addEntity('trigger', { name: 'FinishLine', x: -10, y: 1, z: -7 });
  }

  _tSandbox() {
    this.addEntity('platform', { name: 'Ground', x: 0, y: -0.25, z: 0, w: 30, d: 30 });
    this.addEntity('character', { name: 'Player', x: 0, y: 1, z: 0 });
    for (let i = 0; i < 5; i++) this.addEntity('tree', { name: 'Tree_' + (i + 1), x: (Math.random() - 0.5) * 20, y: 0, z: (Math.random() - 0.5) * 20 });
    this.addEntity('light', { name: 'Sun', x: 5, y: 10, z: 5 });
    this.addEntity('spawn', { name: 'Spawn', x: 0, y: 0.5, z: 0 });
  }

  _tTowerDefense() {
    this.addEntity('platform', { name: 'Field', x: 0, y: -0.25, z: 0, w: 20, d: 20 });
    for (let i = 0; i < 8; i++) this.addEntity('platform', { name: 'Path_' + (i + 1), x: -8 + i * 2, y: 0, z: 0, w: 2, d: 2, color: 0x888866 });
    this.addEntity('trigger', { name: 'TowerSlot_1', x: -4, y: 0.5, z: 3 });
    this.addEntity('trigger', { name: 'TowerSlot_2', x: 0, y: 0.5, z: -3 });
    this.addEntity('trigger', { name: 'TowerSlot_3', x: 4, y: 0.5, z: 3 });
    this.addEntity('spawn', { name: 'EnemySpawn', x: -8, y: 0.5, z: 0 });
    this.addEntity('trigger', { name: 'Base', x: 8, y: 0.5, z: 0 });
    this.addEntity('enemy', { name: 'Wave1_Enemy', x: -8, y: 0.5, z: 0 });
  }

  _tRPG() {
    this.addEntity('platform', { name: 'World', x: 0, y: -0.25, z: 0, w: 24, d: 24 });
    this.addEntity('character', { name: 'Hero', x: 0, y: 1, z: 0 });
    this.addEntity('platform', { name: 'House_1', x: -5, y: 1, z: -5, w: 3, d: 3 });
    this.addEntity('platform', { name: 'Shop', x: -5, y: 1.5, z: 5, w: 4, d: 3 });
    this.addEntity('character', { name: 'NPC_Villager', x: -3, y: 1, z: -3 });
    this.addEntity('character', { name: 'NPC_Merchant', x: -3, y: 1, z: 5 });
    this.addEntity('enemy', { name: 'Goblin_1', x: 5, y: 0.5, z: -5 });
    this.addEntity('enemy', { name: 'Goblin_2', x: 7, y: 0.5, z: 3 });
    this.addEntity('star', { name: 'Treasure_1', x: 8, y: 1.5, z: -8 });
    this.addEntity('star', { name: 'Treasure_2', x: -8, y: 1.5, z: 8 });
    for (let i = 0; i < 6; i++) this.addEntity('tree', { name: 'Tree_' + (i + 1), x: (Math.random() - 0.5) * 20, y: 0, z: (Math.random() - 0.5) * 20 });
    this.addEntity('spawn', { name: 'WorldSpawn', x: 0, y: 0.5, z: 0 });
  }

  // ═══════════════════════════════════════════════
  //  PLAY / STOP
  // ═══════════════════════════════════════════════

  togglePlay() {
    this.isPlaying = !this.isPlaying;
    const b = document.getElementById('btn-play');
    if (b) {
      b.className = this.isPlaying ? 'tool-btn stop-btn' : 'tool-btn play-btn';
      b.innerHTML = this.isPlaying
        ? '<svg viewBox="0 0 16 16" fill="none"><rect x="3" y="3" width="10" height="10" rx="1" fill="currentColor"/></svg> Stop'
        : '<svg viewBox="0 0 16 16" fill="none"><polygon points="4,2 14,8 4,14" fill="currentColor"/></svg> Play';
    }
    if (this.isPlaying) {
      this.engine.playMode.enter(this.entities, this.novaScript);
      this._log('Play mode — WASD to move, Space to jump', 'result');
    } else {
      this.engine.playMode.exit(this.entities);
      this._log('Edit mode', 'result');
    }
  }

  // ═══════════════════════════════════════════════
  //  SAVE / LOAD / EXPORT (no prompt()!)
  // ═══════════════════════════════════════════════

  saveScene() {
    const data = this.project.serialize(this.entities);
    const json = JSON.stringify(data, null, 2);
    if (window.novastarDesktop?.saveDialog) {
      window.novastarDesktop.saveDialog(this.project.config.name.replace(/\s+/g, '_') + '.novastar').then(result => {
        if (result && !result.canceled && result.filePath) {
          window.novastarDesktop.writeFile(result.filePath, json);
          this._log('Saved to ' + result.filePath, 'result');
        }
      });
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      a.download = this.project.config.name.replace(/\s+/g, '_') + '.novastar';
      a.click();
      URL.revokeObjectURL(a.href);
    }
    this.project.saveToRecent(this.project.config.name);
    this._log('Project saved', 'result');
  }

  loadScene() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.novastar,.json';
    input.onchange = async e => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const raw = JSON.parse(await file.text());
        const { entities } = this.project.deserialize(raw);
        this.entities.forEach(ent => this.engine.scene.remove(ent.mesh));
        this.entities = [];
        this.selectedEntity = null;
        if (this.selectionBox) { this.engine.scene.remove(this.selectionBox); this.selectionBox = null; }
        for (const ed of entities) {
          const ent = this.addEntity(ed.type, { name: ed.name, x: ed.position.x, y: ed.position.y, z: ed.position.z, prefabId: ed.prefabId, isPrefabInstance: !!ed.prefabId, tags: ed.tags });
          if (ed.rotation) ent.mesh.rotation.set(ed.rotation.x, ed.rotation.y, ed.rotation.z);
          if (ed.scale) ent.mesh.scale.set(ed.scale.x, ed.scale.y, ed.scale.z);
        }
        this._updateHierarchy();
        this._updatePrefabPanel();
        this._updateStatusBar();
        this._log('Loaded: ' + this.project.config.name, 'result');
      } catch (err) { this._log('Load failed: ' + err.message, 'error'); }
    };
    input.click();
  }

  async exportScene() {
    const format = await this._showExportDialog();
    if (!format) return;
    this._log('Exporting as ' + format + '...', 'log');
    try {
      const config = this.project.config.toJSON ? this.project.config.toJSON() : { name: this.project.config.name };
      const result = await this.engine.exporter.export(this.entities, config, format);
      if (result.success) {
        this._log('Exported to: ' + (result.path || 'download'), 'result');
        if (format === 'desktop') this._log('Run build-exe.bat in the export folder to build the .exe!', 'result');
      } else { this._log('Export failed: ' + (result.error || 'unknown'), 'error'); }
    } catch (err) { this._log('Export error: ' + err.message, 'error'); }
  }

  // ═══════════════════════════════════════════════
  //  ENTITY MANAGEMENT
  // ═══════════════════════════════════════════════

  addEntity(type, opts = {}) {
    let mesh, name;
    try {
      switch (type) {
        case 'platform': mesh = this.builder.platform({ width: opts.w || 4, depth: opts.d || 4, color: opts.color || 0x66bb55 }); name = opts.name || 'Platform'; break;
        case 'character': mesh = this.builder.character({ color: 0x4499ff }); name = opts.name || 'Player'; break;
        case 'star': mesh = this.builder.collectible({ color: 0xffdd44, size: 0.35 }); name = opts.name || 'Star'; break;
        case 'tree': mesh = this.builder.tree({}); name = opts.name || 'Tree'; break;
        case 'enemy': mesh = this.builder.enemy({ color: 0xdd4444, size: 0.5 }); name = opts.name || 'Enemy'; break;
        case 'light': mesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffee88, wireframe: true })); name = opts.name || 'Light'; break;
        case 'spawn': mesh = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 6), new THREE.MeshBasicMaterial({ color: 0x4ee6a0, wireframe: true })); name = opts.name || 'Spawn'; break;
        case 'trigger': mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial({ color: 0x4da8ff, wireframe: true, transparent: true, opacity: 0.3 })); name = opts.name || 'Trigger'; break;
        case 'camera': mesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.8), new THREE.MeshBasicMaterial({ color: 0xa86bff, wireframe: true })); name = opts.name || 'Camera'; break;
        case 'audio-source': mesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffa64d, wireframe: true })); name = opts.name || 'AudioSource'; break;
        default: mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xaaaaaa })); name = opts.name || 'Entity';
      }
    } catch (e) { mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xff00ff })); name = 'Error'; }
    mesh.position.set(opts.x ?? (Math.random() - 0.5) * 4, opts.y ?? (type === 'platform' ? 0 : 1), opts.z ?? (Math.random() - 0.5) * 4);
    const entity = { id: this.entities.length + 1, name: opts.name || name + '_' + (this.entities.length + 1), type, mesh, prefabId: opts.prefabId || null, isPrefabInstance: opts.isPrefabInstance || false, tags: new Set(opts.tags || []), get position() { return mesh.position; }, get rotation() { return mesh.rotation; }, get scale() { return mesh.scale; } };
    mesh.userData._editorEntity = entity;
    this.engine.scene.add(mesh);
    this.entities.push(entity);
    this.project.markDirty();
    this._updateHierarchy();
    this._updateStatusBar();
    return entity;
  }

  deleteSelected() {
    if (!this.selectedEntity) return;
    this.engine.scene.remove(this.selectedEntity.mesh);
    if (this.selectionBox) { this.engine.scene.remove(this.selectionBox); this.selectionBox = null; }
    const n = this.selectedEntity.name;
    this.entities = this.entities.filter(e => e !== this.selectedEntity);
    this.selectedEntity = null;
    this.project.markDirty();
    this._updateHierarchy();
    this._updateInspector();
    this._updateStatusBar();
    this._log('Deleted ' + n, 'log');
  }

  duplicateSelected() {
    if (!this.selectedEntity) return;
    const e = this.selectedEntity;
    this.addEntity(e.type, { name: e.name + '_copy', x: e.position.x + 1, y: e.position.y, z: e.position.z + 1, prefabId: e.prefabId, isPrefabInstance: e.isPrefabInstance });
    this._log('Duplicated ' + e.name, 'result');
  }

  selectEntity(entity) {
    if (this.selectionBox) { this.engine.scene.remove(this.selectionBox); this.selectionBox = null; }
    this.selectedEntity = entity;
    if (entity && entity.mesh) { this.selectionBox = new THREE.BoxHelper(entity.mesh, 0x4ee6a0); this.engine.scene.add(this.selectionBox); }
    this._updateHierarchy();
    this._updateInspector();
  }

  // ═══════════════════════════════════════════════
  //  UI UPDATES
  // ═══════════════════════════════════════════════

  _getTypeIcon(t) {
    const I = { platform: '<svg viewBox="0 0 14 14" fill="none"><rect x="1" y="8" width="12" height="4" rx="1" fill="#4ee6a0"/></svg>', character: '<svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="5" r="3" fill="#4da8ff"/><rect x="5" y="8" width="4" height="4" rx="1.5" fill="#4da8ff"/></svg>', star: '<svg viewBox="0 0 14 14" fill="none"><polygon points="7,1 8.5,5 13,5 9.5,8 11,12 7,9.5 3,12 4.5,8 1,5 5.5,5" fill="#ffe066"/></svg>', tree: '<svg viewBox="0 0 14 14" fill="none"><rect x="6" y="10" width="2" height="3" fill="#8b7355"/><polygon points="7,2 3,10 11,10" fill="#4ee6a0"/></svg>', enemy: '<svg viewBox="0 0 14 14" fill="none"><ellipse cx="7" cy="9" rx="5" ry="3.5" fill="#ff5568"/></svg>', light: '<svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="6" r="3" fill="#ffe066"/></svg>', spawn: '<svg viewBox="0 0 14 14" fill="none"><polygon points="7,2 5,9 9,9" fill="#4ee6a0"/></svg>', trigger: '<svg viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="10" height="10" rx="2" stroke="#4da8ff" stroke-width="1" fill="none" stroke-dasharray="2 1.5"/></svg>', camera: '<svg viewBox="0 0 14 14" fill="none"><rect x="3" y="4" width="8" height="6" rx="1" stroke="#a86bff" stroke-width="1.2"/><circle cx="7" cy="7" r="2" fill="#a86bff"/></svg>' };
    return I[t] || '<svg viewBox="0 0 14 14" fill="none"><rect x="3" y="3" width="8" height="8" rx="1" fill="#6b7394"/></svg>';
  }

  _updateHierarchy() { const tree = document.getElementById('hierarchy-tree'); if (!tree) return; tree.innerHTML = ''; this.entities.forEach(e => { const d = document.createElement('div'); d.className = 'h-item' + (e === this.selectedEntity ? ' selected' : '') + (e.isPrefabInstance ? ' prefab-instance' : ''); const pl = e.isPrefabInstance ? ' <span style="color:var(--purple,#a86bff);font-size:10px;">(prefab)</span>' : ''; d.innerHTML = '<span class="h-icon">' + this._getTypeIcon(e.type) + '</span><span>' + e.name + pl + '</span>'; d.addEventListener('click', () => this.selectEntity(e)); d.addEventListener('contextmenu', ev => { ev.preventDefault(); this.selectEntity(e); const m = document.getElementById('context-menu'); if (m) { m.style.left = ev.clientX + 'px'; m.style.top = ev.clientY + 'px'; m.classList.add('visible'); } }); tree.appendChild(d); }); const c = document.getElementById('entity-count'); if (c) c.textContent = this.entities.length + ' entities'; }

  _updateInspector() { const ct = document.getElementById('rtab-inspector'); if (!ct) return; if (!this.selectedEntity) { ct.innerHTML = '<p class="hint">Select an entity to inspect its properties</p>'; return; } const e = this.selectedEntity; const ps = e.isPrefabInstance ? '<div class="insp-section"><div class="insp-title">Prefab</div><div style="font-size:11px;color:var(--text-dim);margin-bottom:8px;">Instance of <strong style="color:var(--purple);">' + (this.project.prefabs.get(e.prefabId)?.name || 'Prefab') + '</strong></div><button class="insp-btn primary" onclick="window.editor._applyPrefab()">Apply to Prefab</button><button class="insp-btn danger" onclick="window.editor._unlinkPrefab()">Unlink Prefab</button></div>' : ''; ct.innerHTML = '<div class="insp-section"><div class="insp-title">Entity</div><div class="insp-row" style="margin-bottom:10px;"><label style="width:auto;">Name</label><input class="insp-input" value="' + e.name + '" data-prop="name" style="font-weight:700;"></div></div><div class="insp-section"><div class="insp-title">Transform</div><div style="font-size:10px;color:var(--text-muted);margin:0 0 4px 28px;">POSITION</div><div class="insp-row"><label style="color:#ff5568">X</label><input class="insp-input" type="number" step="0.1" value="' + e.position.x.toFixed(2) + '" data-prop="px"><label style="color:#4ee6a0">Y</label><input class="insp-input" type="number" step="0.1" value="' + e.position.y.toFixed(2) + '" data-prop="py"><label style="color:#4da8ff">Z</label><input class="insp-input" type="number" step="0.1" value="' + e.position.z.toFixed(2) + '" data-prop="pz"></div><div style="font-size:10px;color:var(--text-muted);margin:6px 0 4px 28px;">ROTATION</div><div class="insp-row"><label style="color:#ff5568">X</label><input class="insp-input" type="number" step="1" value="' + THREE.MathUtils.radToDeg(e.rotation.x).toFixed(0) + '" data-prop="rx"><label style="color:#4ee6a0">Y</label><input class="insp-input" type="number" step="1" value="' + THREE.MathUtils.radToDeg(e.rotation.y).toFixed(0) + '" data-prop="ry"><label style="color:#4da8ff">Z</label><input class="insp-input" type="number" step="1" value="' + THREE.MathUtils.radToDeg(e.rotation.z).toFixed(0) + '" data-prop="rz"></div><div style="font-size:10px;color:var(--text-muted);margin:6px 0 4px 28px;">SCALE</div><div class="insp-row"><label style="color:#ff5568">X</label><input class="insp-input" type="number" step="0.1" value="' + e.scale.x.toFixed(2) + '" data-prop="sx"><label style="color:#4ee6a0">Y</label><input class="insp-input" type="number" step="0.1" value="' + e.scale.y.toFixed(2) + '" data-prop="sy"><label style="color:#4da8ff">Z</label><input class="insp-input" type="number" step="0.1" value="' + e.scale.z.toFixed(2) + '" data-prop="sz"></div></div>' + ps + '<button class="insp-btn danger" onclick="window.editor.deleteSelected()">Delete Entity</button>'; ct.querySelectorAll('input').forEach(i => { i.addEventListener('change', () => { const p = i.dataset.prop, v = p === 'name' ? i.value : parseFloat(i.value); if (p === 'name') { e.name = v; this._updateHierarchy(); return; } if (p === 'px') e.mesh.position.x = v; if (p === 'py') e.mesh.position.y = v; if (p === 'pz') e.mesh.position.z = v; if (p === 'rx') e.mesh.rotation.x = THREE.MathUtils.degToRad(v); if (p === 'ry') e.mesh.rotation.y = THREE.MathUtils.degToRad(v); if (p === 'rz') e.mesh.rotation.z = THREE.MathUtils.degToRad(v); if (p === 'sx') e.mesh.scale.x = v; if (p === 'sy') e.mesh.scale.y = v; if (p === 'sz') e.mesh.scale.z = v; this.project.markDirty(); }); }); }

  _updatePrefabPanel() { const l = document.getElementById('prefab-list'); if (!l) return; l.innerHTML = ''; for (const p of this.project.prefabs.getAll()) { const c = document.createElement('div'); c.className = 'prefab-card'; c.innerHTML = '<div class="prefab-thumb"><svg viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="14" rx="3" stroke="currentColor" stroke-width="1.5"/><circle cx="10" cy="10" r="3.5" fill="currentColor"/></svg></div><div class="prefab-info"><div class="prefab-name">' + p.name + '</div><div class="prefab-meta">' + p.components.length + ' components</div></div><span class="prefab-badge">PREFAB</span>'; c.addEventListener('dblclick', () => { const inst = p.instantiate({ position: { x: (Math.random() - 0.5) * 6, y: 1, z: (Math.random() - 0.5) * 6 } }); this.addEntity(inst.type, { name: inst.name, x: inst.position.x, y: inst.position.y, z: inst.position.z, prefabId: p.id, isPrefabInstance: true }); this._log('Spawned: ' + p.name, 'result'); }); l.appendChild(c); } }

  _updateStatusBar() { const items = document.querySelectorAll('#status-bar .status-item'); if (items[2]) items[2].textContent = this.entities.length + ' entities'; if (items[3]) items[3].textContent = this.project.prefabs.count + ' prefabs'; }

  _updateModelerUI() { const ml = document.getElementById('model-list'); const pl = document.getElementById('modeler-parts-list'); if (!ml || !pl) return; ml.innerHTML = ''; for (const m of this.modeler.getAll()) { const d = document.createElement('div'); d.className = 'prefab-card' + (m === this.modeler.activeModel ? ' style="border-color:var(--purple);"' : ''); d.innerHTML = '<div class="prefab-thumb" style="background:var(--purple-dim);"><svg viewBox="0 0 20 20" fill="none"><path d="M10 2 L17 6 V14 L10 18 L3 14 V6 Z" stroke="currentColor" stroke-width="1.5" fill="none" style="color:var(--purple);"/></svg></div><div class="prefab-info"><div class="prefab-name">' + m.name + '</div><div class="prefab-meta">' + m.parts.length + ' parts</div></div>'; d.addEventListener('click', () => { this.modeler.setActive(m.id); this.modeler.showInScene(m); this._updateModelerUI(); }); ml.appendChild(d); } pl.innerHTML = ''; if (!this.modeler.activeModel) { pl.innerHTML = '<div style="width:100%;text-align:center;padding:16px;color:var(--text-dim);font-size:11px;font-style:italic;">Select or create a model to start building.</div>'; return; } for (const p of this.modeler.activeModel.parts) { const d = document.createElement('div'); d.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:var(--radius-sm);background:var(--bg-deep);border:1px solid var(--border);cursor:pointer;min-width:140px;transition:all 0.12s;' + (p === this.modeler.selectedPart ? 'border-color:var(--purple);background:var(--purple-dim);' : ''); d.innerHTML = '<span style="width:16px;height:16px;border-radius:3px;background:' + p.color + ';flex-shrink:0;"></span><span style="font-size:11px;font-weight:700;">' + p.name + '</span><span style="font-size:10px;color:var(--text-muted);margin-left:auto;">' + p.type + '</span>'; d.addEventListener('click', () => { this.modeler.selectPart(p); this._updateModelerUI(); }); d.addEventListener('dblclick', async () => { const n = await this._showInputDialog('Rename Part', p.name); if (n) p.name = n; const c = await this._showInputDialog('Color (hex)', p.color); if (c) this.modeler.setPartColor(p, c); this._updateModelerUI(); }); pl.appendChild(d); } }

  // ═══════════════════════════════════════════════
  //  PREFAB / MATERIAL / CAMERA / CONSOLE
  // ═══════════════════════════════════════════════

  _applyPrefab() { if (!this.selectedEntity?.prefabId) return; const c = this.project.prefabs.applyToInstances(this.selectedEntity.prefabId, this.entities); this._log('Applied to ' + c + ' instances', 'result'); }
  _unlinkPrefab() { if (!this.selectedEntity) return; this.selectedEntity.prefabId = null; this.selectedEntity.isPrefabInstance = false; this._updateHierarchy(); this._updateInspector(); this._log('Unlinked', 'log'); }

  _setMaterialType(type) { if (!this.selectedEntity || !this.selectedEntity.mesh) return; const color = document.getElementById('mat-color')?.value || '#66bb55'; const mat = this.engine.materials.create({ type, color }); this._applyMaterialToMesh(this.selectedEntity.mesh, mat); const pbr = document.getElementById('mat-pbr-props'); const toon = document.getElementById('mat-toon-props'); if (pbr) pbr.style.display = type === 'pbr' ? '' : 'none'; if (toon) toon.style.display = type === 'toon' ? '' : 'none'; ['toon', 'pbr', 'unlit'].forEach(t => { const b = document.getElementById('mat-btn-' + t); if (b) { b.style.background = t === type ? 'var(--accent)' : 'var(--bg-surface)'; b.style.color = t === type ? 'var(--bg-deep)' : 'var(--text-dim)'; } }); this.project.markDirty(); this._log('Material: ' + type, 'log'); }
  _setMaterialColor(hex) { if (!this.selectedEntity?.mesh) return; this._applyMaterialToMesh(this.selectedEntity.mesh, null, { color: new THREE.Color(hex) }); this.project.markDirty(); }
  _setMaterialProp(prop, val) { if (!this.selectedEntity?.mesh) return; const numVal = parseFloat(val); const updates = {}; if (prop === 'metalness') { updates.metalness = numVal; const el = document.getElementById('mat-metalness-val'); if (el) el.textContent = numVal.toFixed(1); } else if (prop === 'roughness') { updates.roughness = numVal; const el = document.getElementById('mat-roughness-val'); if (el) el.textContent = numVal.toFixed(1); } else if (prop === 'steps') { updates.gradientMap = this.engine.materials._createGradientTexture(parseInt(val)); const el = document.getElementById('mat-steps-val'); if (el) el.textContent = val; } else if (prop === 'emissive') { updates.emissive = new THREE.Color(val); } else if (prop === 'flatShading') { updates.flatShading = !!val; updates.needsUpdate = true; } else if (prop === 'wireframe') { updates.wireframe = !!val; } this._applyMaterialToMesh(this.selectedEntity.mesh, null, updates); this.project.markDirty(); }
  _applyMaterialPreset(presetName) { if (!this.selectedEntity?.mesh) return; const mat = this.engine.materials.fromPreset(presetName); this._applyMaterialToMesh(this.selectedEntity.mesh, mat); this.project.markDirty(); this._log('Applied preset: ' + presetName, 'result'); }
  _applyMaterialToMesh(mesh, newMat, updates) { if (!mesh) return; const apply = m => { if (newMat) m.material = newMat; else if (updates) Object.entries(updates).forEach(([k, v]) => { if (k === 'needsUpdate') m.material.needsUpdate = true; else if (m.material[k] !== undefined) m.material[k] = v; }); }; if (mesh.isMesh) apply(mesh); else if (mesh.isGroup || mesh.children) mesh.traverse(child => { if (child.isMesh) apply(child); }); }

  _editorUpdate(dt) { if (this.selectionBox && this.selectedEntity) this.selectionBox.update(); const f = document.getElementById('fps-counter'); if (f) f.textContent = this.engine.fps + ' FPS'; }
  _updateCamera() { const x = this.cameraDistance * Math.sin(this.cameraAngleY) * Math.sin(this.cameraAngleX), y = this.cameraDistance * Math.cos(this.cameraAngleY), z = this.cameraDistance * Math.sin(this.cameraAngleY) * Math.cos(this.cameraAngleX); this.engine.camera.position.set(this.cameraTarget.x + x, this.cameraTarget.y + y, this.cameraTarget.z + z); this.engine.camera.lookAt(this.cameraTarget); }

  executeConsoleCommand(code) { this._log('> ' + code, 'log'); try { if (this.novaScript) { const r = this.novaScript.execute(code); if (r != null) this._log(String(r), 'result'); } else { const r = new Function('engine', 'THREE', code)(this.engine, THREE); if (r !== undefined) this._log(String(r), 'result'); } } catch (e) { this._log(e.message, 'error'); } }
  _log(text, type = 'log') { const o = document.getElementById('console-output'); if (!o) return; const l = document.createElement('div'); l.className = type; l.textContent = text; o.appendChild(l); o.scrollTop = o.scrollHeight; }

  _handleSelect(ev) { const r = this.canvas.getBoundingClientRect(), m = new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1), rc = new THREE.Raycaster(); rc.setFromCamera(m, this.engine.camera); const hits = rc.intersectObjects(this.entities.map(e => e.mesh).filter(Boolean), true); if (hits.length > 0) { let o = hits[0].object; while (o.parent && !o.userData._editorEntity) o = o.parent; if (o.userData._editorEntity) { this.selectEntity(o.userData._editorEntity); return; } } this.selectEntity(null); }

  // ═══════════════════════════════════════════════
  //  VIEWPORT + EVENT LISTENERS
  // ═══════════════════════════════════════════════

  _setupViewportResize() { const vp = document.getElementById('viewport'); if (!vp) return; const fn = () => { const r = vp.getBoundingClientRect(); if (r.width < 10) return; this.engine.options.width = r.width; this.engine.options.height = r.height; this.engine.camera.aspect = r.width / r.height; this.engine.camera.updateProjectionMatrix(); this.engine.renderer.resize(r.width, r.height); }; new ResizeObserver(fn).observe(vp); requestAnimationFrame(fn); setTimeout(fn, 200); }

  _setupEventListeners() {
    // Tool buttons
    document.querySelectorAll('.tool-btn[data-tool]').forEach(b => { b.addEventListener('click', () => { document.querySelectorAll('.tool-btn[data-tool]').forEach(x => x.classList.remove('active')); b.classList.add('active'); this.currentTool = b.dataset.tool; }); });

    // Toolbar
    document.getElementById('btn-play')?.addEventListener('click', () => this.togglePlay());
    document.getElementById('btn-save')?.addEventListener('click', () => this.saveScene());
    document.getElementById('btn-load')?.addEventListener('click', () => this.loadScene());
    document.getElementById('btn-export')?.addEventListener('click', () => this.exportScene());
    document.getElementById('btn-undo')?.addEventListener('click', () => { if (this.project.history.undo()) this._log('Undo', 'log'); });
    document.getElementById('btn-redo')?.addEventListener('click', () => { if (this.project.history.redo()) this._log('Redo', 'log'); });

    // Project settings modal
    document.getElementById('btn-project')?.addEventListener('click', () => { const m = document.getElementById('project-modal'); if (m) m.classList.add('visible'); const el = id => document.getElementById(id); if (el('proj-name')) el('proj-name').value = this.project.config.name; if (el('proj-version')) el('proj-version').value = this.project.config.version; if (el('proj-desc')) el('proj-desc').value = this.project.config.description; if (el('proj-gravity')) el('proj-gravity').value = this.project.config.physics.gravity; });
    document.getElementById('modal-save-btn')?.addEventListener('click', () => { const el = id => document.getElementById(id); this.project.config.name = el('proj-name')?.value || 'Untitled'; this.project.config.version = el('proj-version')?.value || '1.0.0'; this.project.config.description = el('proj-desc')?.value || ''; this.project.config.physics.gravity = parseFloat(el('proj-gravity')?.value || -25); document.getElementById('project-modal')?.classList.remove('visible'); this._log('Project settings saved', 'result'); });

    // Entity palette
    document.getElementById('btn-add-entity')?.addEventListener('click', () => this.addEntity('platform'));
    document.getElementById('btn-new-prefab')?.addEventListener('click', () => { if (this.selectedEntity) { const p = this.project.prefabs.createFromEntity(this.selectedEntity); this.selectedEntity.prefabId = p.id; this.selectedEntity.isPrefabInstance = true; this._updatePrefabPanel(); this._updateHierarchy(); this._log('Created prefab: ' + p.name, 'result'); } else this._log('Select an entity first', 'warn'); });
    document.querySelectorAll('.palette-btn').forEach(b => { b.addEventListener('click', () => { const t = b.dataset.type; if (t) { this.addEntity(t); this._log('Added ' + t, 'result'); } }); });

    // Console
    const ci = document.getElementById('console-input');
    ci?.addEventListener('keydown', e => { if (e.key === 'Enter' && ci.value.trim()) { this.executeConsoleCommand(ci.value); ci.value = ''; } });

    // Canvas controls
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    this.canvas.addEventListener('wheel', e => { e.preventDefault(); this.cameraDistance *= e.deltaY > 0 ? 1.1 : 0.9; this.cameraDistance = Math.max(3, Math.min(50, this.cameraDistance)); }, { passive: false });

    let drag = false, lm = { x: 0, y: 0 };
    this.canvas.addEventListener('mousedown', e => { if (e.button === 1 || e.button === 2) { drag = true; lm = { x: e.clientX, y: e.clientY }; } else if (e.button === 0 && this.currentTool === 'select') this._handleSelect(e); });
    window.addEventListener('mousemove', e => { if (!drag) return; this.cameraAngleX -= (e.clientX - lm.x) * 0.005; this.cameraAngleY = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, this.cameraAngleY - (e.clientY - lm.y) * 0.005)); lm = { x: e.clientX, y: e.clientY }; });
    window.addEventListener('mouseup', () => { drag = false; });

    // Keyboard shortcuts
    window.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.ctrlKey || e.metaKey) {
        if (e.code === 'KeyS') { e.preventDefault(); this.saveScene(); }
        if (e.code === 'KeyO') { e.preventDefault(); this.loadScene(); }
        if (e.code === 'KeyZ') { e.preventDefault(); e.shiftKey ? this.project.history.redo() : this.project.history.undo(); }
        if (e.code === 'KeyD') { e.preventDefault(); this.duplicateSelected(); }
        if (e.code === 'KeyE') { e.preventDefault(); this.exportScene(); }
        return;
      }
      switch (e.code) {
        case 'KeyV': document.querySelector('[data-tool="select"]')?.click(); break;
        case 'KeyG': document.querySelector('[data-tool="move"]')?.click(); break;
        case 'KeyR': document.querySelector('[data-tool="rotate"]')?.click(); break;
        case 'KeyS': document.querySelector('[data-tool="scale"]')?.click(); break;
        case 'F5': e.preventDefault(); this.togglePlay(); break;
        case 'Delete': case 'Backspace': this.deleteSelected(); break;
        case 'F2':
          if (this.selectedEntity) {
            this._showInputDialog('Rename Entity', this.selectedEntity.name).then(n => {
              if (n) { this.selectedEntity.name = n; this._updateHierarchy(); this._updateInspector(); }
            });
          }
          break;
      }
    });

    // Modeler events (all use _showInputDialog instead of prompt)
    document.getElementById('btn-new-model')?.addEventListener('click', async () => { const name = await this._showInputDialog('Model Name', 'New Model'); if (!name) return; const m = this.modeler.create(name); this.modeler.showInScene(m); this._updateModelerUI(); this._log('Created model: ' + m.name, 'result'); });
    document.getElementById('btn-import-model')?.addEventListener('click', () => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.novamodel,.json'; i.onchange = async e => { const f = e.target.files[0]; if (f) { const m = await this.modeler.importModel(f); this.modeler.showInScene(m); this._updateModelerUI(); this._log('Imported model: ' + m.name, 'result'); } }; i.click(); });
    document.querySelectorAll('[data-prim]').forEach(b => { b.addEventListener('click', () => { if (!this.modeler.activeModel) { this._log('Create or select a model first', 'warn'); return; } this.modeler.addPrimitive(this.modeler.activeModel, b.dataset.prim); this._updateModelerUI(); this._log('Added ' + b.dataset.prim, 'result'); }); });
    document.querySelectorAll('[data-preset]').forEach(b => { b.addEventListener('click', () => { const p = b.dataset.preset; let m; switch (p) { case 'house': m = this.modeler.presetHouse(); break; case 'tree': m = this.modeler.presetTree(); break; case 'vehicle': m = this.modeler.presetVehicle(); break; case 'sword': m = this.modeler.presetSword(); break; case 'gem': m = this.modeler.presetGem(); break; } if (m) { this.modeler.showInScene(m); this._updateModelerUI(); this._log('Created preset: ' + m.name, 'result'); } }); });
    document.getElementById('btn-model-to-prefab')?.addEventListener('click', () => { if (!this.modeler.activeModel) { this._log('No active model', 'warn'); return; } const pd = this.modeler.toPrefab(this.modeler.activeModel); const pf = this.project.prefabs.add(new Prefab(pd)); this._updatePrefabPanel(); this._log('Saved as prefab: ' + pf.name, 'result'); });
    document.getElementById('btn-export-model')?.addEventListener('click', () => { if (this.modeler.activeModel) this.modeler.exportModel(this.modeler.activeModel); else this._log('No active model', 'warn'); });
    document.getElementById('btn-merge-model')?.addEventListener('click', () => { if (!this.modeler.activeModel) { this._log('No active model', 'warn'); return; } const mg = this.modeler.mergeParts(this.modeler.activeModel); if (mg) { this.modeler.hideFromScene(this.modeler.activeModel); this.engine.scene.add(mg); this._log('Merged ' + this.modeler.activeModel.name, 'result'); } });
  }
}

// ═══════════════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════════════
function boot() {
  try {
    if (window.__novastarTemplate) { window.editor = new EditorApp(); return; }
    const c = setInterval(() => { if (window.__novastarTemplate) { clearInterval(c); try { window.editor = new EditorApp(); } catch (e) { console.error(e); } } }, 100);
  } catch (e) { console.error(e); }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
