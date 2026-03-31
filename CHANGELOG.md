# Changelog

All notable changes to NovaStar Engine are documented here.

Format: each version gets a date, a quick summary, and a list of what changed. New versions go at the top.

---

## v0.4.0 (2026-03-31)

The "make real games" update. Multiplayer, dialogue, quests, inventory, weather, pathfinding, screen effects, API docs, and GitHub sign-in.

### New Engine APIs
- **NovaMultiplayer** - WebSocket multiplayer with rooms, state sync, RPC (remote procedure calls), broadcast events, player join/leave detection, chat system, and ping/latency tracking. Connect to any WebSocket server and sync game state at 50ms intervals.
- **DialogueSystem** - Branching dialogue trees with speaker names, player choices, conditions, variables, and callbacks. Register dialogue trees as JSON-like objects, then start conversations and let players choose their path.
- **QuestSystem** - Quest tracking with objectives, progress counters, completion detection, and reward callbacks. Register quests with multiple objectives, track progress, and get notified when quests complete.
- **InventorySystem** - Full item management with stacking, categories (consumable, equipment, misc), max stack sizes, equipment slots, use/equip/unequip callbacks, rarity tiers, and serialization.
- **WeatherSystem** - Dynamic weather (clear, cloudy, rain, snow, fog, storm) with automatic sky color changes, fog density, and a day/night cycle with sunrise/sunset color transitions. Set time of day or enable automatic cycling.
- **Pathfinding** - A* grid-based pathfinding for AI navigation. Create walkable/blocked grids, find shortest paths with diagonal movement, adjustable movement costs, and integration with the Tilemap system.
- **ScreenEffects** - Camera shake, screen flash, slow motion, freeze frames (hit stop), zoom punch, and continuous rumble. All the game juice effects in one system.

### Website Updates
- **API Docs page** on the website with documentation for every new system, code examples, and parameter tables
- **GitHub sign-in** option added to auth (Firebase GitHub provider)
- Custom SVG illustrations on the API docs page
- Profile system with customizable avatar, banner, badges, and bio

### Engine Changes
- `src/engine/index.js` exports all 7 new systems
- `package.json` bumped to 0.4.0
- `electron/main.cjs` version updated, about dialog updated
- `electron/splash.html` version badge updated

### Firebase Setup Note
To enable GitHub sign-in on the website:
1. Go to Firebase Console > Authentication > Sign-in method
2. Click "Add new provider" > GitHub
3. You'll need a GitHub OAuth app. Go to github.com/settings/developers > OAuth Apps > New
4. Set the callback URL to what Firebase gives you
5. Copy the Client ID and Client Secret into Firebase
6. Save

---

## v0.3.2 (2026-03-31)

Major website overhaul. Full multi-page SPA, community forum, auth system, team signups, and planned events calendar.

### New
- **Full website rebuild** as a single-page app with 5 pages (Home, Events, Community, Learn, Downloads), client-side routing, and persistent nav
- **Auth system** with signup/login, password validation, skill level picker, auto-save to device (localStorage). Shows logged-in user in nav with avatar initial and logout
- **Community forum** with categories (Help, Showcase, Feedback, Off-Topic), post creation, reply threads, category filtering, time-ago timestamps, and seeded starter posts so it doesn't feel empty
- **Team signup form** for the Spring 2026 Game Dev Race. Team name, leader, up to 2 teammates with add/remove tags, game idea field, confirmation screen. Remembers registration across page reloads
- **Events calendar** with 4 planned events for 2026: Spring Game Dev Race (April), Summer Speedrun Jam (June), NovaStar Showcase (September), Holiday Game Jam (December). Status badges (Signups Open, Coming Soon, Planned)
- **Custom SVG illustrations** throughout: hero scene with character, platforms, stars, enemies, trees, and clouds. Showcase cards with inline SVG game previews. All hand-crafted, no external images
- **Learn page** with beginner and advanced tracks: "I'm a total beginner", "I know some code", "I want to make 3D models", "I want to join the game jam"
- **Toast notification system** for success/error feedback
- **Scroll reveal animations** on all pages
- **Humanized copy** throughout. Jokes, casual tone, no corporate speak, no em dashes. Example: "Other engines made you read a 400-page manual. We made ours fun."

### Changes
- `package.json` bumped to 0.3.2
- `website.html` is a complete rewrite (was 580 lines, now ~580+ lines of much richer content)
- Forum posts and user accounts persist in localStorage across sessions
- All download links point to GitHub Releases

### Notes
- Auth and forum use localStorage (device-local). To make it work across devices/users, swap the getUser/saveUser/getForumPosts functions with real API calls. The code has comments marking where.
- Team registrations also save locally. Same swap-in-an-API pattern.

---

## v0.3.1 (2026-03-31)

Website launch and the Spring 2026 Game Development Race event.

### New
- **NovaStar Website** (`website.html`) - Full landing page for the engine with feature showcase, beginner-friendly getting started guide, platform downloads linking to GitHub Releases, FAQ section, and the event page. Can be deployed anywhere as a standalone HTML file.
- **Spring 2026 Game Development Race** - Two-week game jam running April 14-28. Open to all skill levels. Four categories: Best Overall, Best Visuals, Most Creative, Best Beginner Project. Community voting decides winners. Full rules, timeline, and live countdown on the website.
- Live countdown timer to jam start (April 14, noon UTC)
- Scroll-reveal animations throughout the website
- Animated star field in the hero section
- Interactive FAQ with expand/collapse
- Download cards linking directly to GitHub Releases for Windows, Web/Source, and Linux

### Changes
- `package.json` version bumped to 0.3.1
- `vite.config.js` now builds `website.html` as an entry point
- `README.md` updated with website and event info

---

## v0.3.0 (2026-03-31)

The big feature update. Prefabs, a built-in 3D modeler, tilemap editor, audio file loading, UI system, and project management.

### New Features
- **Prefab System** - Create reusable entity templates from the editor or code. Right-click any entity and hit "Make Prefab". Double-click prefabs in the library to spawn instances. Update a prefab and all instances update with it.
- **3D Modeler** - Built-in low-poly model builder right in the editor. Add box/sphere/cylinder/cone/torus/plane primitives, move/rotate/scale them, set colors per part, merge shapes, and save as prefabs. No external modeling software needed.
- **Tilemap Editor** - Paint tile-based levels in a dedicated bottom panel tab. Comes with 10 terrain types (grass, dirt, stone, water, sand, wood, dark stone, lava, ice, eraser). Supports paint, fill, eyedropper, and rectangle tools. Auto-generates physics colliders from solid tiles.
- **Audio File Loading** - Import WAV, MP3, and OGG files alongside the built-in synthesized sounds. Full waveform preview in the editor. Supports looping, volume control, categories (sfx/music), and 3D spatial audio with distance rolloff.
- **UI System Builder** - Visual UI element picker in the editor. Add health bars, score displays, buttons, text boxes, timers, inventory grids, pause menus, and win screens. All use screen-space anchors for responsive positioning.
- **Project Management** - Project settings modal with name, version, description, resolution, FPS target, physics gravity, and build target selection (Web/Windows/Linux). Projects save as `.novastar` v0.3 format with prefabs included.
- **Undo/Redo** - Ctrl+Z and Ctrl+Shift+Z in the editor.
- **Entity Duplication** - Ctrl+D to duplicate the selected entity.
- **Context Menus** - Right-click entities in the hierarchy for quick actions (duplicate, make prefab, add component, rename, delete).
- **Tutorial Page** - `tutorial.html` with interactive getting-started docs, syntax-highlighted code examples, feature walkthrough, and keyboard shortcuts reference.

### Editor Changes
- Completely new editor layout with tabbed panels
- Left panel: Hierarchy tab + Prefabs tab
- Right panel: Inspector tab + Audio tab + UI Builder tab
- Bottom panel: Quick Add tab + Tilemap Editor tab + Console tab
- Status bar showing ready state, scene name, entity count, prefab count, and engine version
- Project settings modal accessible from toolbar
- Camera/Audio Source added to Quick Add palette
- Prefab instances show purple left border and "(prefab)" label in hierarchy
- Welcome screen now shows version badge with pulse animation and Recent Projects tab

### Engine Changes
- `AudioEngine.js` - Added `loadFile()`, `playLoaded()`, `playSpatial()`, `getLoadedFiles()` methods
- `PrefabSystem.js` - New module with `Prefab`, `PrefabLibrary`, `ProjectConfig`, `ProjectManager`, `UndoHistory` classes
- `ModelBuilder.js` - New module for in-editor 3D model creation with primitive operations and prefab export
- `index.js` - Updated exports to include all v0.3 modules
- `NovaStarEngine.js` - Version bumped to v0.3
- `.novastar` save format now includes prefab library and project config alongside entities

### Other
- `package.json` version bumped to 0.3.0
- `vite.config.js` now builds `tutorial.html` as an additional entry point
- Added `CHANGELOG.md` (this file)

---

## v0.2.5 (2026-03-30)

Stability and polish release.

### Changes
- Confirmed auto-updater working via GitHub Releases
- Cache clearing on version change in Electron main process
- NSIS installer wipes Electron cache dirs on install (preserves user project files)
- All auto-updater methods wrapped in try-catch for crash safety
- Version read from package.json at runtime
- `shell.showItemInFolder()` instead of `spawn()` to avoid Windows permission errors

---

## v0.2.0 (2026-03-29)

Editor gets real tools and the engine gets scene transitions.

### New Features
- Gizmo handles for move/rotate/scale in the editor (GizmoSystem.js)
- Scene transitions with fade, wipe, iris, and loading screen effects (SceneTransition.js)
- Custom SVG icon system replacing emoji (works everywhere, no platform differences)
- Welcome screen with 6 game templates (3D Platformer, 2D Top-Down, Side-Scroller, Arena Shooter, Puzzle, Blank)
- Auto-updater that checks GitHub Releases on startup
- Error boundaries and crash-proof try-catch throughout the codebase

### Engine Additions
- GizmoSystem.js
- SceneTransition.js
- Welcome screen template system in EditorApp.js
- Auto-updater in electron/auto-updater.cjs

---

## v0.1.0 (2026-03-27)

Initial release. The foundation of everything.

### What's Included
- Core engine with fixed-timestep game loop (NovaStarEngine.js)
- Toon shader renderer with 3-band lighting, rim lights, and cel shading (Renderer.js)
- Synthesized audio engine with 9 built-in sound effects (AudioEngine.js)
- Particle system with 6 presets and custom emitters (ParticleSystem.js)
- Unified input manager for keyboard, gamepad, and touch (InputManager.js)
- AABB physics with gravity, friction, triggers, and raycasting (PhysicsWorld.js)
- Scene manager with registration and async loading (SceneManager.js)
- Mesh builder for quick low-poly characters, platforms, trees, enemies, collectibles (MeshBuilder.js)
- NovaScript custom scripting language with lexer, parser, and interpreter
- Visual scene editor with hierarchy, inspector, Quick Add palette, and console
- Star Hopper demo game
- Electron desktop app with splash screen and native file dialogs
- Vite build system with multi-page support
