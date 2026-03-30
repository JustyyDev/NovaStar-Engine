/**
 * NovaScript Interpreter
 * Executes NovaScript AST nodes against the NovaStar Engine
 */

import { Lexer } from './Lexer.js';
import { Parser } from './Parser.js';

class Environment {
  constructor(parent = null) {
    this.vars = new Map();
    this.parent = parent;
  }

  get(name) {
    if (this.vars.has(name)) return this.vars.get(name);
    if (this.parent) return this.parent.get(name);
    throw new Error(`[NovaScript] Undefined variable: ${name}`);
  }

  set(name, value) {
    if (this.vars.has(name)) { this.vars.set(name, value); return; }
    if (this.parent) { this.parent.set(name, value); return; }
    throw new Error(`[NovaScript] Cannot assign to undefined variable: ${name}`);
  }

  define(name, value) {
    this.vars.set(name, value);
  }

  has(name) {
    if (this.vars.has(name)) return true;
    if (this.parent) return this.parent.has(name);
    return false;
  }
}

// Signals for control flow
class ReturnSignal { constructor(value) { this.value = value; } }
class BreakSignal {}
class ContinueSignal {}

export class Interpreter {
  constructor(engine) {
    this.engine = engine;
    this.globalEnv = new Environment();
    this._entityDefs = new Map();

    this._setupGlobals();
  }

  _setupGlobals() {
    const env = this.globalEnv;

    // Engine API bindings
    env.define('Input', {
      getMovement: () => this.engine.input.getMovement(),
      isAction: (name) => this.engine.input.isAction(name),
      isActionJustPressed: (name) => this.engine.input.isActionJustPressed(name),
      mapAction: (name, mapping) => this.engine.input.mapAction(name, mapping),
    });

    env.define('Audio', {
      play: (name) => this.engine.audio.play(name),
      playNote: (freq, dur, type) => this.engine.audio.playNote(freq, dur, type),
      playMelody: (notes, type, vol) => this.engine.audio.playMelody(notes, type, vol),
      setVolume: (v) => this.engine.audio.setMasterVolume(v),
      setSFXVolume: (v) => this.engine.audio.setSFXVolume(v),
      setMusicVolume: (v) => this.engine.audio.setMusicVolume(v),
    });

    env.define('Particles', {
      emit: (opts) => this.engine.particles.emit(opts),
      collectEffect: (pos) => this.engine.particles.collectEffect(pos),
      landEffect: (pos) => this.engine.particles.landEffect(pos),
      dashEffect: (pos) => this.engine.particles.dashEffect(pos),
      jumpEffect: (pos) => this.engine.particles.jumpEffect(pos),
      explosionEffect: (pos, color) => this.engine.particles.explosionEffect(pos, color),
      sparkle: (pos) => this.engine.particles.sparkle(pos),
    });

    env.define('Scene', {
      load: (name) => this.engine.scenes.load(name),
      reload: () => this.engine.scenes.reload(),
      current: () => this.engine.scenes.current,
    });

    // Camera system
    env.define('Camera', {
      follow: (target, offset, smooth) => this.engine.cam.follow(target, offset, smooth),
      orbit: (target, dist, angle) => this.engine.cam.orbit(target, dist, angle),
      fixed: (pos, lookAt) => this.engine.cam.fixed(pos, lookAt),
      firstPerson: (target, h) => this.engine.cam.firstPerson(target, h),
      sideScroll: (target, offset) => this.engine.cam.sideScroll(target, offset),
      topDown: (target, h) => this.engine.cam.topDown(target, h),
      shake: (intensity, duration) => this.engine.cam.shake(intensity, duration),
      free: () => this.engine.cam.free(),
    });

    // UI system
    env.define('UI', {
      text: (content, opts) => this.engine.ui.text(content, opts),
      healthBar: (opts) => this.engine.ui.healthBar(opts),
      button: (text, onClick, opts) => this.engine.ui.button(text, onClick, opts),
      panel: (opts) => this.engine.ui.panel(opts),
      toast: (msg, opts) => this.engine.ui.toast(msg, opts),
      dialogue: (speaker, text, opts) => this.engine.ui.dialogue(speaker, text, opts),
      fade: (opts) => this.engine.ui.fade(opts),
      clear: () => this.engine.ui.clear(),
    });

    // Animation / tweening
    env.define('Anim', {
      tween: (target, props, opts) => this.engine.anim.tween(target, props, opts),
      wait: (seconds) => this.engine.anim.wait(seconds),
      squash: (obj, intensity, dur) => this.engine.anim.squash(obj, intensity, dur),
      shake: (obj, intensity, dur) => this.engine.anim.shake(obj, intensity, dur),
      popIn: (obj, dur) => this.engine.anim.popIn(obj, dur),
      popOut: (obj, dur) => this.engine.anim.popOut(obj, dur),
      bob: (obj, amp, speed) => this.engine.anim.bob(obj, amp, speed),
      spin: (obj, speed, axis) => this.engine.anim.spin(obj, speed, axis),
    });

    // Timer system
    env.define('Timer', {
      after: (seconds, cb) => this.engine.timers.after(seconds, cb),
      every: (seconds, cb, max) => this.engine.timers.every(seconds, cb, max),
      countdown: (seconds, onTick, onDone) => this.engine.timers.countdown(seconds, onTick, onDone),
      cancel: (id) => this.engine.timers.cancel(id),
      wait: (seconds) => this.engine.timers.wait(seconds),
    });

    // Save system
    env.define('Save', {
      save: (slot, data) => this.engine.save.save(slot, data),
      load: (slot) => this.engine.save.load(slot),
      exists: (slot) => this.engine.save.exists(slot),
      delete: (slot) => this.engine.save.delete(slot),
      set: (key, val) => this.engine.save.set(key, val),
      get: (key, def) => this.engine.save.get(key, def),
    });

    // Events
    env.define('Events', {
      on: (event, cb) => this.engine.events.on(event, cb),
      once: (event, cb) => this.engine.events.once(event, cb),
      emit: (event, ...args) => this.engine.events.emit(event, ...args),
      off: (event, cb) => this.engine.events.off(event, cb),
    });

    // Asset loading
    env.define('Assets', {
      loadModel: (url, opts) => this.engine.assets ? this.engine.assets.loadModel(url, opts) : null,
      loadTexture: (url, opts) => this.engine.assets ? this.engine.assets.loadTexture(url, opts) : null,
      loadJSON: (url) => this.engine.assets ? this.engine.assets.loadJSON(url) : null,
      preload: (assets, onProgress) => this.engine.assets ? this.engine.assets.preload(assets, onProgress) : null,
    });

    // 2D System
    env.define('Sprite', {
      create: (url, opts) => this.engine.system2d.createSprite(url, opts),
      createColor: (opts) => this.engine.system2d.createColorSprite(opts),
      animator: (sprite, opts) => this.engine.system2d.createAnimator(sprite, opts),
      overlap: (a, b) => this.engine.system2d.overlap(a, b),
      distance: (a, b) => this.engine.system2d.distance(a, b),
      moveTowards: (s, tx, ty, speed, dt) => this.engine.system2d.moveTowards(s, tx, ty, speed, dt),
    });

    env.define('Tilemap', {
      create: (opts) => this.engine.system2d.createTilemap(opts),
    });

    env.define('Mode2D', {
      enable: (opts) => this.engine.system2d.enable2D(opts),
    });

    // Build system
    env.define('Build', {
      configure: (config) => this.engine.build.configure(config),
      build: (platform) => this.engine.build.build(platform),
      status: () => this.engine.build.getStatus(),
    });

    // Engine reference
    env.define('Engine', {
      deltaTime: () => this.engine.deltaTime,
      elapsedTime: () => this.engine.elapsedTime,
      fps: () => this.engine.fps,
      pause: () => this.engine.pause(),
      resume: () => this.engine.resume(),
    });

    // Math builtins
    env.define('Math', Math);
    env.define('print', (...args) => console.log('[NovaScript]', ...args));
    env.define('random', () => Math.random());
    env.define('randomRange', (min, max) => min + Math.random() * (max - min));
    env.define('randomInt', (min, max) => Math.floor(min + Math.random() * (max - min + 1)));
    env.define('abs', Math.abs);
    env.define('floor', Math.floor);
    env.define('ceil', Math.ceil);
    env.define('round', Math.round);
    env.define('min', Math.min);
    env.define('max', Math.max);
    env.define('clamp', (v, lo, hi) => Math.max(lo, Math.min(hi, v)));
    env.define('lerp', (a, b, t) => a + (b - a) * t);
    env.define('inverseLerp', (a, b, v) => (v - a) / (b - a));
    env.define('remap', (v, inMin, inMax, outMin, outMax) => outMin + (v - inMin) / (inMax - inMin) * (outMax - outMin));
    env.define('sin', Math.sin);
    env.define('cos', Math.cos);
    env.define('tan', Math.tan);
    env.define('atan2', Math.atan2);
    env.define('sqrt', Math.sqrt);
    env.define('pow', Math.pow);
    env.define('sign', Math.sign);
    env.define('PI', Math.PI);
    env.define('TAU', Math.PI * 2);
    env.define('DEG2RAD', Math.PI / 180);
    env.define('RAD2DEG', 180 / Math.PI);
    env.define('toRadians', (deg) => deg * Math.PI / 180);
    env.define('toDegrees', (rad) => rad * 180 / Math.PI);
    env.define('distance', (x1, y1, x2, y2) => Math.sqrt((x2-x1)**2 + (y2-y1)**2));
    env.define('distance3D', (x1,y1,z1,x2,y2,z2) => Math.sqrt((x2-x1)**2 + (y2-y1)**2 + (z2-z1)**2));
    env.define('smoothstep', (edge0, edge1, x) => { const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0))); return t * t * (3 - 2 * t); });
    env.define('pingpong', (t, length) => length - Math.abs(t % (length * 2) - length));

    // Array/collection helpers
    env.define('range', (start, end, step = 1) => {
      const arr = [];
      for (let i = start; i < end; i += step) arr.push(i);
      return arr;
    });
    env.define('shuffle', (arr) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    });
    env.define('pick', (arr) => arr[Math.floor(Math.random() * arr.length)]);

    // String helpers
    env.define('toString', (v) => String(v));
    env.define('toNumber', (v) => Number(v));
    env.define('toInt', (v) => parseInt(v));
    env.define('toFloat', (v) => parseFloat(v));

    // Object/Vec helpers
    env.define('vec2', (x, y) => ({ x: x || 0, y: y || 0 }));
    env.define('vec3', (x, y, z) => ({ x: x || 0, y: y || 0, z: z || 0 }));
    env.define('color', (r, g, b) => ({ r: r || 0, g: g || 0, b: b || 0 }));
    env.define('hex', (hexStr) => parseInt(hexStr.replace('#', ''), 16));

    // Time
    env.define('time', () => this.engine.elapsedTime);
    env.define('deltaTime', () => this.engine.deltaTime);
    env.define('fps', () => this.engine.fps);
  }

  /**
   * Parse and execute a NovaScript source string
   */
  execute(source) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    return this._execProgram(ast, this.globalEnv);
  }

  _execProgram(node, env) {
    let result = null;
    for (const stmt of node.body) {
      result = this._exec(stmt, env);
    }
    return result;
  }

  _exec(node, env) {
    if (!node) return null;

    switch (node.type) {
      case 'EntityDeclaration': return this._execEntity(node, env);
      case 'FunctionDeclaration': return this._execFuncDecl(node, env);
      case 'VarDeclaration': return this._execVarDecl(node, env);
      case 'IfStatement': return this._execIf(node, env);
      case 'WhileStatement': return this._execWhile(node, env);
      case 'ForStatement': return this._execFor(node, env);
      case 'ReturnStatement': throw new ReturnSignal(node.value ? this._eval(node.value, env) : null);
      case 'Break': throw new BreakSignal();
      case 'Continue': throw new ContinueSignal();
      case 'Block': return this._execBlock(node, env);
      case 'ExpressionStatement': return this._eval(node.expression, env);
      case 'PrintStatement': console.log('[NovaScript]', this._eval(node.value, env)); return null;
      case 'SpawnStatement': return this._execSpawn(node, env);
      case 'DestroyStatement': return this._execDestroy(node, env);
      case 'EmitStatement': return this._execEmit(node, env);
      case 'SceneStatement': return this._execScene(node, env);
      default:
        return this._eval(node, env);
    }
  }

  _eval(node, env) {
    if (!node) return null;

    switch (node.type) {
      case 'NumberLiteral': return node.value;
      case 'StringLiteral': return node.value;
      case 'BooleanLiteral': return node.value;
      case 'NullLiteral': return null;
      case 'ArrayLiteral': return node.elements.map(e => this._eval(e, env));
      case 'Identifier': return env.get(node.name);
      case 'ThisExpression': return env.get('this');

      case 'Binary': {
        const left = this._eval(node.left, env);
        const right = this._eval(node.right, env);
        switch (node.op) {
          case '+': return left + right;
          case '-': return left - right;
          case '*': return left * right;
          case '/': return left / right;
          case '%': return left % right;
          case '==': return left === right;
          case '!=': return left !== right;
          case '<': return left < right;
          case '>': return left > right;
          case '<=': return left <= right;
          case '>=': return left >= right;
          case '&&': return left && right;
          case '||': return left || right;
        }
        break;
      }

      case 'Unary': {
        const operand = this._eval(node.operand, env);
        if (node.op === '-') return -operand;
        if (node.op === '!') return !operand;
        break;
      }

      case 'Assignment': {
        const value = this._eval(node.right, env);
        if (node.left.type === 'Identifier') {
          env.set(node.left.name, value);
        } else if (node.left.type === 'MemberAccess') {
          const obj = this._eval(node.left.object, env);
          obj[node.left.property] = value;
        } else if (node.left.type === 'IndexAccess') {
          const obj = this._eval(node.left.object, env);
          const idx = this._eval(node.left.index, env);
          obj[idx] = value;
        }
        return value;
      }

      case 'MemberAccess': {
        const obj = this._eval(node.object, env);
        if (obj == null) throw new Error(`[NovaScript] Cannot access property '${node.property}' of null`);
        const val = obj[node.property];
        if (typeof val === 'function') return val.bind(obj);
        return val;
      }

      case 'IndexAccess': {
        const obj = this._eval(node.object, env);
        const idx = this._eval(node.index, env);
        return obj[idx];
      }

      case 'FunctionCall': {
        const callee = this._eval(node.callee, env);
        const args = node.args.map(a => this._eval(a, env));
        if (typeof callee !== 'function') {
          throw new Error(`[NovaScript] ${JSON.stringify(node.callee)} is not callable`);
        }
        return callee(...args);
      }

      case 'PostfixOp': {
        const val = this._eval(node.operand, env);
        if (node.operand.type === 'Identifier') {
          env.set(node.operand.name, node.op === '++' ? val + 1 : val - 1);
        }
        return val;
      }
    }

    return null;
  }

  // ─── STATEMENT EXECUTORS ───────────────────────
  _execEntity(node, env) {
    this._entityDefs.set(node.name, node);
    env.define(node.name, node);
  }

  _execFuncDecl(node, env) {
    const fn = (...args) => {
      const localEnv = new Environment(env);
      node.params.forEach((p, i) => localEnv.define(p.name, args[i]));
      try {
        this._exec(node.body, localEnv);
      } catch (e) {
        if (e instanceof ReturnSignal) return e.value;
        throw e;
      }
      return null;
    };
    env.define(node.name, fn);
    return fn;
  }

  _execVarDecl(node, env) {
    const value = node.init ? this._eval(node.init, env) : null;
    env.define(node.name, value);
  }

  _execIf(node, env) {
    if (this._eval(node.condition, env)) {
      return this._exec(node.consequent, env);
    } else if (node.alternate) {
      return this._exec(node.alternate, env);
    }
  }

  _execWhile(node, env) {
    let maxIter = 100000;
    while (this._eval(node.condition, env) && maxIter-- > 0) {
      try {
        this._exec(node.body, env);
      } catch (e) {
        if (e instanceof BreakSignal) break;
        if (e instanceof ContinueSignal) continue;
        throw e;
      }
    }
  }

  _execFor(node, env) {
    const loopEnv = new Environment(env);
    this._exec(node.init, loopEnv);
    let maxIter = 100000;
    while (this._eval(node.condition, loopEnv) && maxIter-- > 0) {
      try {
        this._exec(node.body, loopEnv);
      } catch (e) {
        if (e instanceof BreakSignal) break;
        if (e instanceof ContinueSignal) { this._eval(node.update, loopEnv); continue; }
        throw e;
      }
      this._eval(node.update, loopEnv);
    }
  }

  _execBlock(node, env) {
    const localEnv = new Environment(env);
    let result = null;
    for (const stmt of node.statements) {
      result = this._exec(stmt, localEnv);
    }
    return result;
  }

  _execSpawn(node, env) {
    console.log(`[NovaScript] Spawning ${node.entityName}`);
    return this.engine.createEntity(node.entityName);
  }

  _execDestroy(node, env) {
    const target = this._eval(node.target, env);
    if (target && target.id) this.engine.destroyEntity(target.id);
  }

  _execEmit(node, env) {
    const pos = node.position ? this._eval(node.position, env) : { x: 0, y: 0, z: 0 };
    const name = node.effectName;
    if (this.engine.particles[name + 'Effect']) {
      this.engine.particles[name + 'Effect'](pos);
    }
  }

  _execScene(node, env) {
    const arg = this._eval(node.arg, env);
    if (node.method === 'load') this.engine.scenes.load(arg);
    if (node.method === 'reload') this.engine.scenes.reload();
  }
}
