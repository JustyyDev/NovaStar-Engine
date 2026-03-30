# ⭐ NovaStar Engine v0.1

A cartoony low-poly 3D game engine with a custom scripting language and visual editor.
Built for making Nintendo-style games with a futuristic twist.

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# ─── Option 1: Web development ───
npm run dev                    # Start web dev server at localhost:3000

# ─── Option 2: Desktop app (recommended) ───
npm run electron:dev           # Launch as native desktop application

# ─── Option 3: Build installer (.exe / .dmg / .AppImage) ───
npm run electron:build:win     # Windows → NovaStar-Setup-0.1.0.exe
npm run electron:build:mac     # macOS   → NovaStar-0.1.0.dmg
npm run electron:build:linux   # Linux   → NovaStar-0.1.0.AppImage
npm run electron:build:all     # All platforms at once
```

### Desktop App Features
When running as a desktop app, NovaStar includes:
- **Native window** with custom titlebar and splash screen
- **File menu** with Save/Open dialogs (Ctrl+S, Ctrl+O)
- **Build menu** to export games for Web, Windows, macOS, Linux
- **Native file system** access for reading/writing scene files
- Installs to `Program Files` with desktop shortcut and Start menu entry

---

## 📁 Project Structure

```
novastar-engine/
├── src/
│   ├── engine/              # Core engine
│   │   ├── NovaStarEngine.js    # Main engine class & game loop
│   │   ├── Renderer.js          # Cartoony toon shaders & lighting
│   │   ├── AudioEngine.js       # Synthesized sound effects
│   │   ├── ParticleSystem.js    # Particle emitters & presets
│   │   ├── InputManager.js      # Keyboard, gamepad, touch
│   │   ├── PhysicsWorld.js      # AABB physics & collision
│   │   ├── SceneManager.js      # Level loading & switching
│   │   ├── MeshBuilder.js       # Low-poly mesh factories
│   │   └── index.js             # Public API exports
│   │
│   ├── novascript/          # Custom scripting language
│   │   ├── Lexer.js             # Tokenizer
│   │   ├── Parser.js            # AST parser
│   │   ├── Interpreter.js       # Runtime interpreter
│   │   └── index.js
│   │
│   ├── editor/              # Visual scene editor
│   │   ├── EditorApp.js         # Editor application
│   │   └── editor.css           # Editor styles
│   │
│   ├── game/                # Demo game: Star Hopper
│   │   ├── StarHopper.js        # Game code (JavaScript)
│   │   ├── StarHopper.nova      # Game code (NovaScript example)
│   │   └── styles.css           # Game HUD styles
│   │
│   └── main.js              # Entry point
│
├── electron/                # Desktop application
│   ├── main.js                  # Electron main process
│   ├── preload.js               # Native API bridge
│   ├── splash.html              # Startup splash screen
│   └── assets/                  # Icons & installer assets
│       └── icon.svg             # Engine icon (convert to .ico/.icns)
│
├── scripts/
│   └── generate-icons.js    # Icon format converter
│
├── index.html               # Game page
├── editor.html              # Editor page
├── package.json             # Dependencies & build scripts
├── vite.config.js           # Vite bundler config
├── electron-builder.json    # Installer configuration
├── LICENSE
└── README.md
```

---

## 🎮 Controls

| Action      | Keyboard        | Gamepad   |
|-------------|-----------------|-----------|
| Move        | WASD / Arrows   | Left Stick |
| Jump        | Space           | A Button   |
| Dash        | Shift           | X Button   |
| Action      | F / J           | B Button   |

---

## 🧩 Engine Architecture

### Core Engine (`NovaStarEngine`)
The main game loop with fixed timestep physics:
```js
import { NovaStarEngine } from './engine/index.js';

const engine = new NovaStarEngine(canvas);
engine.start();

engine.onUpdate((dt) => {
  // Runs every frame
});

engine.onFixedUpdate((dt) => {
  // Runs at fixed 60Hz (physics)
});

engine.onLateUpdate((dt) => {
  // Runs after update (camera)
});
```

### Renderer
Cartoony toon shading with 3-band lighting, rim lights, and specular:
```js
// Create a toon material
const mat = engine.renderer.createToonMaterial(0x44aaff);

// Or the simpler cartoon material
const mat2 = engine.renderer.createCartoonMaterial(0xff4444);

// Set sky gradient
engine.renderer.setSkyColor(0x6ec6ff, 0xb8e8ff);

// Add distance fog
engine.renderer.setFog(0xb8e8ff, 30, 80);
```

### Audio Engine
All sounds are synthesized — no external files needed:
```js
// Play built-in sounds
engine.audio.play('jump');     // Chirpy jump
engine.audio.play('land');     // Thud with dust
engine.audio.play('collect');  // Ascending chime
engine.audio.play('dash');     // Whoosh
engine.audio.play('bounce');   // Boing
engine.audio.play('hurt');     // Descending buzz
engine.audio.play('powerup');  // Ascending arpeggios
engine.audio.play('step');     // Soft footstep
engine.audio.play('explosion');// Boom + noise

// Play a custom note
engine.audio.playNote(440, 0.3, 'sine');

// Play a melody
engine.audio.playMelody([
  { note: 523, duration: 0.15 },
  { note: 659, duration: 0.15 },
  { note: 784, duration: 0.3 },
]);

// Register your own sound
engine.audio.registerSound('mySound', (ctx, dest) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(dest);
  osc.frequency.value = 440;
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc.start(); osc.stop(ctx.currentTime + 0.2);
});
```

### Particle System
Burst emitters with presets for game juice:
```js
// Use presets
engine.particles.collectEffect(position);
engine.particles.landEffect(position);
engine.particles.dashEffect(position);
engine.particles.jumpEffect(position);
engine.particles.explosionEffect(position, 0xff6633);
engine.particles.sparkle(position);

// Custom emitter
engine.particles.emit({
  position: new THREE.Vector3(0, 2, 0),
  count: 20,
  color: 0xff44aa,
  colorEnd: 0x440022,
  size: 0.2,
  speed: 5,
  lifetime: 1.0,
  gravity: -8,
  spread: 1,
  shape: 'sphere',  // 'sphere', 'ring', 'fountain', 'trail', 'random'
  sizeDecay: true,
});
```

### Physics
Simple AABB physics for platformers:
```js
// Create a dynamic body (player)
const body = engine.physics.createBody({
  position: new THREE.Vector3(0, 5, 0),
  halfExtents: new THREE.Vector3(0.5, 0.5, 0.5),
  gravity: -25,
  friction: 0.9,
  maxSpeed: 15,
  tag: 'player'
});

// Create a static platform
const platform = engine.physics.createBody({
  position: new THREE.Vector3(0, 0, 0),
  halfExtents: new THREE.Vector3(5, 0.5, 5),
  isStatic: true,
  tag: 'ground'
});

// Create a trigger (no collision, just detection)
const trigger = engine.physics.createBody({
  position: new THREE.Vector3(3, 1, 0),
  halfExtents: new THREE.Vector3(0.5, 0.5, 0.5),
  isStatic: true,
  isTrigger: true,
  tag: 'coin'
});

trigger.onTriggerEnter = (other) => {
  if (other.tag === 'player') {
    console.log('Collected!');
  }
};

// Check state
body.isGrounded; // true if standing on something
body.velocity;   // THREE.Vector3

// Raycast
const hit = engine.physics.raycast(origin, direction, maxDistance);
if (hit) {
  console.log(hit.body, hit.distance, hit.point);
}
```

### Mesh Builder
Quick cartoony low-poly objects:
```js
const builder = new MeshBuilder(engine);

const player = builder.character({ color: 0x44aaff });
const platform = builder.platform({ width: 4, depth: 4, color: 0x66bb55 });
const star = builder.collectible({ color: 0xffdd44, shape: 'star' });
const tree = builder.tree({ height: 3, leafColor: 0x44aa33 });
const enemy = builder.enemy({ color: 0xdd4444, type: 'slime' });
const ground = builder.ground({ size: 100, color: 0x77bb55 });
```

### Input Manager
Unified input across keyboard, gamepad, and touch:
```js
// Query actions (mapped to multiple input sources)
engine.input.isAction('jump');           // Is held
engine.input.isActionJustPressed('jump'); // Just pressed this frame

// Get movement vector (normalized)
const move = engine.input.getMovement(); // { x, y }

// Custom action mapping
engine.input.mapAction('attack', {
  keys: ['KeyZ', 'KeyJ'],
  gamepadButton: 1,
  touchButton: 'attack'
});
```

### Scene Manager
```js
// Register scenes
engine.scenes.register('menu', { init: (engine) => { ... } });
engine.scenes.register('level-1', { init: (engine) => { ... }, cleanup: (engine) => { ... } });

// Load a scene (clears previous, runs init)
await engine.scenes.load('level-1');

// Reload current scene
await engine.scenes.reload();
```

---

## 📝 NovaScript Language

NovaScript is a custom scripting language that looks like a mix of C++, C#, and JavaScript.
It's designed for defining game entities and behavior.

### Syntax Example:
```novascript
entity Player {
  var speed: float = 5.0;
  var jumpForce: float = 12.0;

  fn onUpdate(dt: float) {
    let move = Input.getMovement();
    this.velocity.x += move.x * speed * dt;

    if (Input.isActionJustPressed("jump") && this.isGrounded) {
      this.velocity.y = jumpForce;
      Audio.play("jump");
      Particles.jumpEffect(this.position);
    }
  }

  fn onCollision(other: Entity) {
    if (other.tag == "coin") {
      destroy(other);
      Audio.play("collect");
    }
  }
}
```

### Built-in APIs available in NovaScript:
- `Input.getMovement()`, `Input.isAction(name)`, `Input.isActionJustPressed(name)`
- `Audio.play(name)`, `Audio.playNote(freq, duration, type)`
- `Particles.emit(options)`, `Particles.collectEffect(pos)`, etc.
- `Scene.load(name)`, `Scene.reload()`
- `Math.*`, `print(value)`, `random()`, `sin()`, `cos()`, etc.

---

## 🎨 Visual Editor

Open `http://localhost:3000/editor.html` for the scene editor.

### Features:
- **Scene Hierarchy** — View and select all entities
- **Inspector** — Edit position, rotation, scale
- **Quick Add Palette** — Drop in platforms, characters, enemies, etc.
- **NovaScript Console** — Execute NovaScript commands live
- **Orbit Camera** — Right-click drag to orbit, scroll to zoom
- **Save/Load** — Export scenes as `.novastar` JSON files

### Keyboard Shortcuts:
| Key    | Action        |
|--------|---------------|
| V      | Select tool   |
| G      | Move tool     |
| R      | Rotate tool   |
| S      | Scale tool    |
| F5     | Play / Stop   |
| Delete | Delete entity |

---

## 🗺 Roadmap

### v0.2 (Current)
- [x] Gizmo handles for move/rotate/scale in editor
- [x] Scene transitions and loading screens (fade, wipe, iris, loading)
- [x] Custom SVG icon system (no emoji dependencies)
- [x] Welcome screen with game templates
- [x] Auto-updater via GitHub Releases
- [x] Crash-proof error handling throughout

### v0.3
- [ ] Prefab system (reusable entity templates)
- [ ] Tilemap / level grid editor
- [ ] Audio file loading (WAV/MP3/OGG)
- [ ] Basic UI system (health bars, menus)

### v0.4
- [ ] Electron desktop export
- [ ] Asset pipeline (GLTF/GLB model import)
- [ ] Skeletal animation support
- [ ] Mobile touch controls refinement

### v1.0
- [ ] Full NovaScript language with hot reload
- [ ] Plugin system
- [ ] WebGPU rendering backend
- [ ] Console export preparation (requires devkit access)

---

## 📜 License

MIT — build whatever you want with it.

---

*Built with ❤️ for game developers who dream big and start small.*
