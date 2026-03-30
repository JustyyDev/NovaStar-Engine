/**
 * NovaStar Engine — Main Entry Point
 * Bootstraps the engine and loads the Star Hopper demo
 */

import { NovaStarEngine } from './engine/index.js';
import { Interpreter } from './novascript/index.js';
import { createDemoGame } from './game/StarHopper.js';

// ─── BOOT ────────────────────────────────────────
const canvas = document.getElementById('game-canvas');
const splash = document.getElementById('splash');
const startBtn = document.getElementById('startBtn');
const controlsHint = document.getElementById('controls-hint');

// Create engine instance
const engine = new NovaStarEngine(canvas, {
  debug: false,
});

// Create NovaScript interpreter (available for scripted content)
const novaScript = new Interpreter(engine);
window.novaScript = novaScript; // Expose for console debugging

// Create demo game
const game = createDemoGame(engine);

// Register as a scene
engine.scenes.register('star-hopper', {
  init: () => game.init(),
});

// ─── START GAME ──────────────────────────────────
startBtn.addEventListener('click', async () => {
  splash.classList.add('hidden');

  // Start the engine
  engine.start();

  // Load the demo scene
  await engine.scenes.load('star-hopper');

  // Hide controls hint after 5 seconds
  setTimeout(() => {
    if (controlsHint) controlsHint.classList.add('hidden');
  }, 5000);
});

// Also start on any key press
window.addEventListener('keydown', function startOnKey(e) {
  if (splash.classList.contains('hidden')) return;
  if (e.code === 'Space' || e.code === 'Enter') {
    startBtn.click();
    window.removeEventListener('keydown', startOnKey);
  }
});

// ─── EXPOSE ENGINE GLOBALLY FOR DEBUGGING ────────
window.engine = engine;

console.log(
  '%c⭐ NovaStar Engine v0.1\n%cType `engine` or `novaScript` in console to inspect',
  'color: #5ff59a; font-weight: bold; font-size: 16px;',
  'color: #888; font-size: 12px;'
);
