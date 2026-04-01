# Five Nights at NovaStar's

A FNAF-style horror game demo built with **NovaStar Engine v0.4.2**.

This project demonstrates the engine's ability to create horror/survival games using:
- First-person office view with mouse-look panning
- Security camera system with live feeds
- AI animatronics with pathfinding and state machines
- Door and light mechanics with power management
- Jumpscare system with screen effects
- Night/time progression

## How to Play

1. Open `index.html` in a browser (or run via a local server)
2. Click **START NIGHT** to begin
3. Survive from **12 AM to 6 AM**

### Controls
- **Mouse** — Look around the office
- **Left/Right DOOR buttons** — Close doors (uses power)
- **Left/Right LIGHT buttons** — Hold to illuminate hallways (check for animatronics)
- **CAMERAS button** — Open security camera monitor
- **ESC** — Close cameras
- **Click camera tabs** — Switch between camera feeds

### Tips
- Watch the cameras to track animatronics
- If you see one at your door (use the light!), **close that door immediately**
- Every device uses power — don't leave doors closed or cameras open when you don't need them
- If power runs out, you can't close doors... and they're coming

## Animatronics

| Name | Color | Behavior |
|------|-------|----------|
| NovaBot 🤖 | Blue | Moves through Stage → Dining → West Hall → Left Door |
| StarFox 🦊 | Orange | Moves through Stage → Dining → East Hall → Right Door |
| PixelBear 🐻 | Purple | Moves through Backstage → Kitchen → Closet → East Hall → Right Door |

## Built With

- [NovaStar Engine v0.4.2](https://github.com/JustyyDev/NovaStar-Engine)
- Three.js for 3D rendering
- Vanilla JavaScript — no build step required

## Project Structure

```
fnaf-demo/
├── index.html    — Complete game (single file, runs in browser)
├── README.md     — This file
└── assets/       — Place custom textures/sounds here
```

## Customization

Want to make your own version? Here are some things to try:

- **Add more animatronics** — Add entries to the `ANIMATRONICS` array with custom paths
- **Change difficulty** — Adjust `aggression`, `moveInterval`, and `NIGHT_DURATION`
- **Custom jumpscares** — Replace emoji with images using `SpriteSystem.jumpscare()`
- **Add sounds** — Use `AudioEngine.play()` for ambient sounds, door slams, jumpscares
- **Multiple nights** — Increase aggression values each night

## License

MIT — Part of the NovaStar Engine project.
