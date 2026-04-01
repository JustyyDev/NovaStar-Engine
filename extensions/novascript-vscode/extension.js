const vscode = require('vscode');

// ─── ENGINE API DOCUMENTATION ────────────────────
const API_DOCS = {
  // Input
  'Input': { detail: 'Input Manager', doc: 'Unified input system for keyboard, gamepad, and touch.\n\nMethods:\n- `getMovement()` - Returns `{x, y}` movement vector\n- `isAction(name)` - Is action currently held\n- `isActionJustPressed(name)` - Was action pressed this frame\n- `mapAction(name, mapping)` - Map a custom action' },
  'Input.getMovement': { detail: '(): {x: float, y: float}', doc: 'Get the current movement direction as a normalized vector.\nCombines keyboard (WASD/Arrows), gamepad (left stick), and touch input.' },
  'Input.isAction': { detail: '(name: string): bool', doc: 'Check if an action is currently held down.\nBuilt-in actions: "jump", "dash", "action", "left", "right", "up", "down"' },
  'Input.isActionJustPressed': { detail: '(name: string): bool', doc: 'Check if an action was just pressed this frame (not held).' },

  // Audio
  'Audio': { detail: 'Audio Engine', doc: 'Synthesized sound effects system. No audio files needed.\n\nMethods:\n- `play(name)` - Play a built-in sound\n- `playNote(freq, duration, type)` - Play a single note\n- `playMelody(notes, type, volume)` - Play a melody' },
  'Audio.play': { detail: '(name: string): void', doc: 'Play a built-in sound effect.\n\nAvailable sounds:\n- "jump" - Chirpy jump\n- "land" - Thud with dust\n- "collect" - Ascending chime\n- "dash" - Whoosh\n- "bounce" - Boing\n- "hurt" - Descending buzz\n- "powerup" - Ascending arpeggios\n- "step" - Soft footstep\n- "explosion" - Boom with noise' },

  // Particles
  'Particles': { detail: 'Particle System', doc: 'GPU-friendly particle emitters for game juice.\n\nPreset effects:\n- `collectEffect(pos)` - Star collect burst\n- `landEffect(pos)` - Dust puff\n- `dashEffect(pos)` - Speed trail\n- `jumpEffect(pos)` - Jump burst\n- `explosionEffect(pos, color)` - Explosion\n- `sparkle(pos)` - Ambient sparkle\n- `emit(options)` - Custom emitter' },
  'Particles.emit': { detail: '(options: object): Emitter', doc: 'Emit a custom particle burst.\n\nOptions:\n- position: vec3 (required)\n- count: int (default: 15)\n- color: hex (default: 0xffffff)\n- colorEnd: hex (lerp target)\n- size: float (default: 0.15)\n- speed: float (default: 4)\n- lifetime: float (default: 1.0)\n- gravity: float (default: -8)\n- spread: float (default: 1)\n- shape: "sphere"|"ring"|"fountain"|"trail"|"random"\n- sizeDecay: bool (default: true)' },

  // Camera
  'Camera': { detail: 'Camera System', doc: 'Multiple camera modes for any game type.\n\nModes:\n- `follow(target, offset, smoothness)` - Follow a target\n- `orbit(target, distance, angle)` - Orbit around target\n- `fixed(position, lookAt)` - Fixed position\n- `firstPerson(target, height)` - First person\n- `sideScroll(target, offset)` - 2.5D side-scroller\n- `topDown(target, height)` - Top-down view\n- `shake(intensity, duration)` - Camera shake\n- `free()` - No automatic movement' },

  // Scene
  'Scene': { detail: 'Scene Manager', doc: 'Load and switch between game scenes/levels.\n\n- `load(name)` - Load a scene by name\n- `reload()` - Reload current scene\n- `current()` - Get current scene name' },

  // UI
  'UI': { detail: 'UI System', doc: 'In-game HUD elements rendered as HTML overlay.\n\n- `text(content, options)` - Text label\n- `healthBar(options)` - Health/progress bar\n- `button(text, onClick, options)` - Clickable button\n- `panel(options)` - Container panel\n- `toast(message, options)` - Toast notification\n- `dialogue(speaker, text, options)` - Dialogue box\n- `fade(options)` - Screen fade\n- `clear()` - Remove all UI' },

  // Animation
  'Anim': { detail: 'Animation System', doc: 'Tweening and procedural animation.\n\n- `tween(target, props, options)` - Animate properties\n- `wait(seconds)` - Promise-based delay\n- `squash(object, intensity, duration)` - Squash & stretch\n- `shake(object, intensity, duration)` - Shake effect\n- `popIn(object, duration)` - Pop in from scale 0\n- `popOut(object, duration)` - Pop out to scale 0\n- `bob(object, amplitude, speed)` - Bobbing motion\n- `spin(object, speed, axis)` - Continuous rotation' },

  // Timer
  'Timer': { detail: 'Timer System', doc: 'Game timers, delays, and intervals.\n\n- `after(seconds, callback)` - Call after delay\n- `every(seconds, callback, maxCount)` - Repeat at interval\n- `countdown(seconds, onTick, onDone)` - Countdown timer\n- `wait(seconds)` - Promise-based wait\n- `cancel(id)` - Cancel a timer' },

  // Save
  'Save': { detail: 'Save System', doc: 'Persistent game data and save slots.\n\n- `save(slot, data)` - Save to a slot\n- `load(slot)` - Load from a slot\n- `exists(slot)` - Check if slot exists\n- `delete(slot)` - Delete a slot\n- `set(key, value)` - Set persistent value\n- `get(key, default)` - Get persistent value' },

  // Events
  'Events': { detail: 'Event System', doc: 'Global event bus for decoupled communication.\n\n- `on(event, callback)` - Listen for event\n- `once(event, callback)` - Listen once\n- `emit(event, ...args)` - Fire event\n- `off(event, callback)` - Remove listener' },

  // Math builtins
  'lerp': { detail: '(a: float, b: float, t: float): float', doc: 'Linear interpolation between a and b by factor t (0-1).' },
  'clamp': { detail: '(value: float, min: float, max: float): float', doc: 'Clamp a value between min and max.' },
  'smoothstep': { detail: '(edge0: float, edge1: float, x: float): float', doc: 'Smooth Hermite interpolation between 0 and 1.' },
  'randomRange': { detail: '(min: float, max: float): float', doc: 'Random float between min and max.' },
  'randomInt': { detail: '(min: int, max: int): int', doc: 'Random integer between min and max (inclusive).' },
  'distance': { detail: '(x1, y1, x2, y2): float', doc: '2D distance between two points.' },
  'distance3D': { detail: '(x1, y1, z1, x2, y2, z2): float', doc: '3D distance between two points.' },
  'vec2': { detail: '(x: float, y: float): {x, y}', doc: 'Create a 2D vector.' },
  'vec3': { detail: '(x: float, y: float, z: float): {x, y, z}', doc: 'Create a 3D vector.' },
  'time': { detail: '(): float', doc: 'Get elapsed time in seconds since engine started.' },
  'deltaTime': { detail: '(): float', doc: 'Get time elapsed since last frame in seconds.' },
};

// ─── COMPLETION ITEMS ────────────────────────────
const ENGINE_APIS = [
  { label: 'Input', kind: vscode.CompletionItemKind.Module, detail: 'Input Manager' },
  { label: 'Audio', kind: vscode.CompletionItemKind.Module, detail: 'Audio Engine' },
  { label: 'Particles', kind: vscode.CompletionItemKind.Module, detail: 'Particle System' },
  { label: 'Camera', kind: vscode.CompletionItemKind.Module, detail: 'Camera System' },
  { label: 'Scene', kind: vscode.CompletionItemKind.Module, detail: 'Scene Manager' },
  { label: 'UI', kind: vscode.CompletionItemKind.Module, detail: 'UI System' },
  { label: 'Anim', kind: vscode.CompletionItemKind.Module, detail: 'Animation System' },
  { label: 'Timer', kind: vscode.CompletionItemKind.Module, detail: 'Timer System' },
  { label: 'Save', kind: vscode.CompletionItemKind.Module, detail: 'Save System' },
  { label: 'Events', kind: vscode.CompletionItemKind.Module, detail: 'Event Bus' },
  { label: 'Engine', kind: vscode.CompletionItemKind.Module, detail: 'Engine Core' },
  { label: 'Math', kind: vscode.CompletionItemKind.Module, detail: 'Math utilities' },
];

const METHOD_MAP = {
  'Input': ['getMovement', 'isAction', 'isActionJustPressed', 'mapAction'],
  'Audio': ['play', 'playNote', 'playMelody', 'setVolume', 'setSFXVolume', 'setMusicVolume'],
  'Particles': ['emit', 'collectEffect', 'landEffect', 'dashEffect', 'jumpEffect', 'explosionEffect', 'sparkle'],
  'Camera': ['follow', 'orbit', 'fixed', 'firstPerson', 'sideScroll', 'topDown', 'shake', 'free', 'cutTo'],
  'Scene': ['load', 'reload', 'current'],
  'UI': ['text', 'healthBar', 'button', 'panel', 'toast', 'dialogue', 'fade', 'clear'],
  'Anim': ['tween', 'wait', 'squash', 'shake', 'popIn', 'popOut', 'bob', 'spin', 'sequence', 'parallel'],
  'Timer': ['after', 'every', 'countdown', 'wait', 'cancel', 'cooldown'],
  'Save': ['save', 'load', 'exists', 'delete', 'set', 'get', 'listSlots'],
  'Events': ['on', 'once', 'emit', 'off', 'clear'],
  'Engine': ['deltaTime', 'elapsedTime', 'fps', 'pause', 'resume'],
};

function activate(context) {
  console.log('NovaScript extension activated');

  // ─── HOVER PROVIDER ──────────────────────────
  const hoverProvider = vscode.languages.registerHoverProvider('novascript', {
    provideHover(document, position) {
      const range = document.getWordRangeAtPosition(position, /[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*/);
      if (!range) return;

      const word = document.getText(range);

      // Check direct match
      if (API_DOCS[word]) {
        const md = new vscode.MarkdownString();
        md.appendCodeblock(API_DOCS[word].detail, 'novascript');
        md.appendMarkdown('\n\n' + API_DOCS[word].doc);
        return new vscode.Hover(md, range);
      }

      // Check if it's a method on a known API
      const parts = word.split('.');
      if (parts.length === 2) {
        const key = `${parts[0]}.${parts[1]}`;
        if (API_DOCS[key]) {
          const md = new vscode.MarkdownString();
          md.appendCodeblock(`${parts[0]}.${parts[1]}${API_DOCS[key].detail}`, 'novascript');
          md.appendMarkdown('\n\n' + API_DOCS[key].doc);
          return new vscode.Hover(md, range);
        }
      }

      return null;
    }
  });

  // ─── COMPLETION PROVIDER ─────────────────────
  const completionProvider = vscode.languages.registerCompletionItemProvider('novascript', {
    provideCompletionItems(document, position) {
      const linePrefix = document.lineAt(position).text.substring(0, position.character);

      // Check if we're after a dot (method completion)
      const dotMatch = linePrefix.match(/(\w+)\.$/);
      if (dotMatch) {
        const obj = dotMatch[1];
        const methods = METHOD_MAP[obj];
        if (methods) {
          return methods.map(m => {
            const item = new vscode.CompletionItem(m, vscode.CompletionItemKind.Method);
            const docKey = `${obj}.${m}`;
            if (API_DOCS[docKey]) {
              item.detail = API_DOCS[docKey].detail;
              item.documentation = new vscode.MarkdownString(API_DOCS[docKey].doc);
            }
            return item;
          });
        }
      }

      // Global completions
      const items = [];

      // Engine APIs
      ENGINE_APIS.forEach(api => {
        const item = new vscode.CompletionItem(api.label, api.kind);
        item.detail = api.detail;
        if (API_DOCS[api.label]) {
          item.documentation = new vscode.MarkdownString(API_DOCS[api.label].doc);
        }
        items.push(item);
      });

      // Keywords
      const keywords = [
        'entity', 'fn', 'var', 'let', 'const', 'if', 'else', 'while', 'for',
        'foreach', 'in', 'return', 'break', 'continue', 'true', 'false', 'null',
        'this', 'new', 'import', 'from', 'class', 'extends', 'spawn', 'destroy',
        'emit', 'print', 'scene', 'switch', 'case', 'default', 'try', 'catch',
        'async', 'await',
      ];
      keywords.forEach(kw => {
        items.push(new vscode.CompletionItem(kw, vscode.CompletionItemKind.Keyword));
      });

      // Types
      const types = ['int', 'float', 'double', 'string', 'bool', 'void', 'vec2', 'vec3', 'vec4', 'color', 'Entity'];
      types.forEach(t => {
        items.push(new vscode.CompletionItem(t, vscode.CompletionItemKind.TypeParameter));
      });

      // Builtin functions
      const builtins = [
        'print', 'random', 'randomRange', 'randomInt', 'abs', 'floor', 'ceil',
        'round', 'min', 'max', 'clamp', 'lerp', 'smoothstep', 'sin', 'cos',
        'tan', 'atan2', 'sqrt', 'pow', 'sign', 'toRadians', 'toDegrees',
        'distance', 'distance3D', 'vec2', 'vec3', 'color', 'hex', 'time',
        'deltaTime', 'fps', 'range', 'shuffle', 'pick',
      ];
      builtins.forEach(fn => {
        const item = new vscode.CompletionItem(fn, vscode.CompletionItemKind.Function);
        if (API_DOCS[fn]) {
          item.detail = API_DOCS[fn].detail;
          item.documentation = new vscode.MarkdownString(API_DOCS[fn].doc);
        }
        items.push(item);
      });

      return items;
    }
  }, '.');

  // ─── COMMANDS ────────────────────────────────
  const runCmd = vscode.commands.registerCommand('novascript.runFile', () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    const terminal = vscode.window.createTerminal('NovaScript');
    terminal.show();
    terminal.sendText(`echo "NovaScript runner coming soon - for now, use the NovaStar Editor to run .nova files"`);
  });

  const docsCmd = vscode.commands.registerCommand('novascript.openDocs', () => {
    vscode.env.openExternal(vscode.Uri.parse('https://github.com/JustyyDev/NovaStar-Engine#readme'));
  });

  context.subscriptions.push(hoverProvider, completionProvider, runCmd, docsCmd);
}

function deactivate() {}

module.exports = { activate, deactivate };
