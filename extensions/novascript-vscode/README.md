# NovaScript Language Support for VS Code

Full language support for **NovaScript** (`.nova`) - the scripting language for [NovaStar Engine](https://github.com/JustyyDev/NovaStar-Engine).

## Features

### Syntax Highlighting
Full color-coded syntax for all NovaScript constructs:
- Entity and class declarations
- Functions (`fn`), variables (`var`, `let`, `const`)
- Control flow (`if`, `else`, `for`, `while`, `switch`)
- All engine APIs (Input, Audio, Particles, Camera, UI, etc.)
- Types (`int`, `float`, `string`, `bool`, `vec2`, `vec3`)
- Comments, strings, numbers, operators

### Auto-Completion
- All engine API modules with descriptions
- Method completion after typing `Input.`, `Audio.`, `Camera.`, etc.
- Built-in function suggestions (lerp, clamp, randomRange, etc.)
- Keyword and type completion

### Hover Documentation
Hover over any engine API to see detailed documentation:
- Parameter types and return values
- Usage examples
- Available options and enums

### Code Snippets
Type a prefix and press Tab to insert common patterns:

| Prefix | Description |
|--------|-------------|
| `entity` | New entity with update |
| `entitycol` | Entity with collision handling |
| `fn` | Function declaration |
| `onupdate` | Update lifecycle |
| `oncollision` | Collision handler |
| `player` | Complete player controller |
| `enemy` | Enemy with patrol AI |
| `collectible` | Spinning collectible |
| `movement` | Player movement code |
| `jump` | Jump with sound and particles |
| `audio` | Play a sound |
| `particles` | Emit particles |
| `camfollow` | Camera follow |
| `camshake` | Camera shake |
| `tween` | Tween animation |
| `toast` | UI toast notification |
| `dialogue` | Dialogue box |
| `save` / `load` | Save/load game data |
| `spawn` / `destroy` | Entity lifecycle |
| `timerafter` | Delayed execution |
| `timerevery` | Repeated execution |

### File Extensions
- `.nova` - NovaScript source files
- `.novascript` - Alternative extension
- `.ns` - Short extension

## Installation

### From VSIX (manual)
1. Download `novascript-lang-0.2.5.vsix` from the releases
2. In VS Code: Extensions (Ctrl+Shift+X) > ... > Install from VSIX
3. Select the `.vsix` file

### From source (development)
1. Clone this repo
2. Copy the folder to `~/.vscode/extensions/novascript-lang`
3. Reload VS Code

## Example

```novascript
entity Player {
  var speed: float = 8.0;
  var jumpForce: float = 14.0;
  var health: int = 3;

  fn onUpdate(dt: float) {
    let move = Input.getMovement();
    this.velocity.x += move.x * speed * dt;
    this.velocity.z += move.y * speed * dt;

    if (Input.isActionJustPressed("jump") && this.isGrounded) {
      this.velocity.y = jumpForce;
      Audio.play("jump");
      Particles.jumpEffect(this.position);
    }
  }

  fn onCollision(other: Entity) {
    if (other.tag == "coin") {
      Audio.play("collect");
      Particles.collectEffect(other.position);
      destroy(other);
    }
  }
}
```

## Links
- [NovaStar Engine](https://github.com/JustyyDev/NovaStar-Engine)
- [Report Issues](https://github.com/JustyyDev/NovaStar-Engine/issues)

## License
MIT
