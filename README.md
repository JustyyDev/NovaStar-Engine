# NovaStar Engine

A cartoony low-poly 3D game engine for building Nintendo-style games. Comes with a visual editor, a built-in 3D modeler, a custom scripting language, prefabs, tilemaps, and more.

Built on Three.js + Vite + Electron.

## Quick Start

```bash
npm install
npm run dev              # starts web dev server on localhost:3000
npm run electron:dev     # launches as a desktop app (recommended)
```

Once it's running:
- **Editor** is at `localhost:3000/editor.html`
- **Tutorial/Docs** at `localhost:3000/tutorial.html`
- **Website** at `localhost:3000/website.html`
- **Demo Game** at `localhost:3000`

## Spring 2026 Game Development Race

We're running a 2-week game jam from April 14-28, 2026. Build a game with NovaStar and submit it. Open to everyone, including total beginners. Categories for Best Overall, Best Visuals, Most Creative, and Best Beginner Project. Check out `website.html` for all the details, rules, and timeline. Sign up on GitHub.

## Building Installers

```bash
npm run electron:build:win     # Windows .exe installer
npm run electron:build:mac     # macOS .dmg
npm run electron:build:linux   # Linux .AppImage
npm run electron:build:all     # all platforms
```

## What Can It Do?

NovaStar is a full game engine with everything you need to go from idea to playable game:

**Editor** - A visual scene editor with drag-and-drop entity placement, transform gizmos, a scene hierarchy, inspector panel, and a live NovaScript console. Pick a template (3D Platformer, Top-Down RPG, Side-Scroller, Arena Shooter, Puzzle) or start from scratch.

**3D Modeler** - Build custom low-poly models right inside the editor. Supports box, sphere, cylinder, cone, torus, and plane primitives. Move, rotate, and scale individual parts. Merge shapes together, set colors per-part, and save your creations as prefabs you can reuse across your whole game.

**Prefab System** - Create reusable entity templates. Design an enemy once with all its components (mesh, physics, AI, health), save it as a prefab, then spawn copies everywhere. Update the prefab and every instance updates too.

**Tilemap Editor** - Paint tile-based levels with a palette of terrain types. Multiple layers, fill and rectangle tools, and automatic collision generation from solid tiles. Works great for top-down RPGs and 2D platformers.

**Audio** - Two ways to add sound. Built-in synthesized effects (jump, collect, dash, bounce, hurt, explosion, etc.) that work with zero file loading. Or import your own WAV/MP3/OGG files with waveform preview and 3D spatial audio.

**UI System** - Build in-game HUD elements: health bars, score displays, buttons, timers, inventory grids, and menu screens. Position them with screen-space anchors.

**Physics** - AABB collision with gravity, friction, triggers, and raycasting. Good enough for platformers, top-down games, and simple 3D action.

**Particles** - Burst emitters with presets for game juice. Collect sparkles, landing dust, dash trails, explosions, and more.

**NovaScript** - A custom scripting language that reads like a mix of C# and JavaScript. Define entity behaviors, handle collisions, play sounds, and spawn particles, all from `.nova` files.

**Scene Management** - Register multiple scenes, switch between them with transitions (fade, wipe, iris), and manage game state.

**Desktop App** - Runs as a native Electron app with a custom titlebar, splash screen, file dialogs, and auto-updates from GitHub Releases.

## Project Structure

```
novastar-engine/
  src/
    engine/           - core engine (physics, rendering, audio, input, etc.)
    editor/           - visual editor app
    novascript/       - custom scripting language (lexer, parser, interpreter)
    game/             - Star Hopper demo game
  electron/           - desktop app (main process, preload, splash screen)
  scripts/            - build helper scripts
  editor.html         - editor entry point
  tutorial.html       - getting started docs
  index.html          - game/demo entry point
  CHANGELOG.md        - version history
```

## Controls

| Action | Keyboard | Gamepad |
|--------|----------|---------|
| Move | WASD / Arrows | Left Stick |
| Jump | Space | A Button |
| Dash | Shift | X Button |
| Action | F / J | B Button |

## Editor Shortcuts

| Key | What it does |
|-----|-------------|
| V | Select tool |
| G | Move tool |
| R | Rotate tool |
| S | Scale tool |
| F5 | Play / Stop |
| Delete | Delete selected entity |
| Ctrl+D | Duplicate selected |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |
| Ctrl+S | Save project |
| Ctrl+O | Open project |
| F2 | Rename selected entity |

## Code Examples

### Basic Engine Setup
```js
import { NovaStarEngine } from './engine/index.js';

const engine = new NovaStarEngine(canvas);
engine.start();

engine.onUpdate((dt) => {
  // runs every frame
});
```

### Spawning Entities
```js
import { MeshBuilder } from './engine/MeshBuilder.js';

const builder = new MeshBuilder(engine);
const player = builder.character({ color: 0x44aaff });
const platform = builder.platform({ width: 4, depth: 4, color: 0x66bb55 });
const star = builder.collectible({ color: 0xffdd44, shape: 'star' });
```

### Playing Audio
```js
// built-in sounds (no files needed)
engine.audio.play('jump');
engine.audio.play('collect');
engine.audio.play('explosion');

// load your own audio files
await engine.audio.loadFile('bgm', 'assets/music.mp3');
engine.audio.playLoaded('bgm', { loop: true, volume: 0.6 });
```

### NovaScript
```
entity Player {
  var speed: float = 5.0;
  var jumpForce: float = 12.0;

  fn onUpdate(dt: float) {
    let move = Input.getMovement();
    this.velocity.x += move.x * speed * dt;

    if (Input.isActionJustPressed("jump") && this.isGrounded) {
      this.velocity.y = jumpForce;
      Audio.play("jump");
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

### Using the 3D Modeler from Code
```js
import { ModelBuilder } from './engine/ModelBuilder.js';

const modeler = new ModelBuilder(engine);

// create a simple house
const house = modeler.create('My House');
modeler.addPrimitive(house, 'box', {
  size: { x: 2, y: 1.5, z: 2 },
  color: 0xcc8844,
  position: { x: 0, y: 0.75, z: 0 }
});
modeler.addPrimitive(house, 'cone', {
  radius: 1.5, height: 1.2, segments: 4,
  color: 0xdd4444,
  position: { x: 0, y: 2.1, z: 0 }
});

// convert to a prefab for reuse
const prefab = modeler.toPrefab(house, 'House');
```

## Roadmap

Check [CHANGELOG.md](CHANGELOG.md) for detailed version history.

### Done
- v0.1 - Core engine, editor, NovaScript, demo game
- v0.2 - Gizmos, scene transitions, welcome screen, auto-updater, templates
- v0.3 - Prefabs, tilemap editor, audio file loading, UI system, 3D modeler, project management
- v0.3.1 - NovaStar website, Spring 2026 Game Development Race event
- v0.3.2 - Full website with auth, community forum, team signups, events calendar, custom SVG art
- v0.4.0 - Multiplayer API, dialogue system, quests, inventory, weather/day-night, pathfinding, screen effects, API docs

### Coming Up
- v0.4 - GLTF/GLB model import, skeletal animation, mobile touch polish
- v1.0 - Full NovaScript with hot reload, plugin system, WebGPU renderer

## License

MIT. Build whatever you want with it.
