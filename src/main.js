/**
 * NovaStar Engine — Game Entry Point
 * Only runs on the game page (index.html), not the editor
 */

import { NovaStarEngine } from './engine/index.js';
import { createDemoGame } from './game/StarHopper.js';

const canvas = document.getElementById('game-canvas');

// Only initialize if we're on the game page
if (canvas) {
  const splash = document.getElementById('splash');
  const startBtn = document.getElementById('startBtn');
  const controlsHint = document.getElementById('controls-hint');

  const engine = new NovaStarEngine(canvas, { debug: false });
  const game = createDemoGame(engine);

  engine.scenes.register('star-hopper', {
    init: () => game.init(),
  });

  if (startBtn) {
    startBtn.addEventListener('click', async () => {
      if (splash) splash.classList.add('hidden');
      engine.start();
      await engine.scenes.load('star-hopper');
      setTimeout(() => { if (controlsHint) controlsHint.classList.add('hidden'); }, 5000);
    });
  }

  window.addEventListener('keydown', function startOnKey(e) {
    if (splash && splash.classList.contains('hidden')) return;
    if (e.code === 'Space' || e.code === 'Enter') {
      if (startBtn) startBtn.click();
      window.removeEventListener('keydown', startOnKey);
    }
  });

  window.engine = engine;
}
