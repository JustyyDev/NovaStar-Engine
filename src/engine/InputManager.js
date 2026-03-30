/**
 * NovaStar Input Manager
 * Unified input across keyboard, gamepad, and touch
 */

export class InputManager {
  constructor(engine) {
    this.engine = engine;

    // Keyboard state
    this._keys = {};
    this._keysJustPressed = {};
    this._keysJustReleased = {};
    this._prevKeys = {};

    // Gamepad state
    this.gamepadAxes = { x: 0, y: 0 };
    this.gamepadButtons = {};
    this._prevGamepadButtons = {};

    // Touch / joystick
    this.touchJoystick = { x: 0, y: 0, active: false };
    this.touchButtons = { jump: false, dash: false };

    // Virtual axes (combined from all sources)
    this.axes = { x: 0, y: 0 };

    // Action mapping
    this._actionMap = new Map();
    this._setupDefaultActions();

    // Event listeners
    window.addEventListener('keydown', (e) => this._onKeyDown(e));
    window.addEventListener('keyup', (e) => this._onKeyUp(e));

    // Prevent default for game keys
    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });
  }

  // ─── ACTION MAPPING ────────────────────────────
  _setupDefaultActions() {
    this.mapAction('jump',  { keys: ['Space', 'ArrowUp', 'KeyW'], gamepadButton: 0, touchButton: 'jump' });
    this.mapAction('dash',  { keys: ['ShiftLeft', 'ShiftRight', 'KeyE'], gamepadButton: 2, touchButton: 'dash' });
    this.mapAction('left',  { keys: ['ArrowLeft', 'KeyA'] });
    this.mapAction('right', { keys: ['ArrowRight', 'KeyD'] });
    this.mapAction('up',    { keys: ['ArrowUp', 'KeyW'] });
    this.mapAction('down',  { keys: ['ArrowDown', 'KeyS'] });
    this.mapAction('action', { keys: ['KeyF', 'KeyJ'], gamepadButton: 1 });
  }

  mapAction(name, mapping) {
    this._actionMap.set(name, mapping);
  }

  // ─── KEYBOARD ──────────────────────────────────
  _onKeyDown(e) {
    this._keys[e.code] = true;
  }

  _onKeyUp(e) {
    this._keys[e.code] = false;
  }

  /** Is the key currently held */
  isKeyDown(code) {
    return !!this._keys[code];
  }

  /** Was the key just pressed this frame */
  isKeyJustPressed(code) {
    return !!this._keysJustPressed[code];
  }

  /** Was the key just released this frame */
  isKeyJustReleased(code) {
    return !!this._keysJustReleased[code];
  }

  // ─── ACTION QUERIES ────────────────────────────
  /** Is the action currently held */
  isAction(name) {
    const mapping = this._actionMap.get(name);
    if (!mapping) return false;

    // Check keys
    if (mapping.keys) {
      for (const key of mapping.keys) {
        if (this._keys[key]) return true;
      }
    }
    // Check gamepad
    if (mapping.gamepadButton !== undefined && this.gamepadButtons[mapping.gamepadButton]) {
      return true;
    }
    // Check touch
    if (mapping.touchButton && this.touchButtons[mapping.touchButton]) {
      return true;
    }
    return false;
  }

  /** Was the action just pressed this frame */
  isActionJustPressed(name) {
    const mapping = this._actionMap.get(name);
    if (!mapping) return false;

    if (mapping.keys) {
      for (const key of mapping.keys) {
        if (this._keysJustPressed[key]) return true;
      }
    }
    if (mapping.gamepadButton !== undefined) {
      if (this.gamepadButtons[mapping.gamepadButton] && !this._prevGamepadButtons[mapping.gamepadButton]) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get movement direction as a normalized vector
   * Combines keyboard, gamepad, and touch
   */
  getMovement() {
    let x = 0, y = 0;

    // Keyboard
    if (this.isAction('left'))  x -= 1;
    if (this.isAction('right')) x += 1;
    if (this.isAction('up'))    y -= 1;
    if (this.isAction('down'))  y += 1;

    // Gamepad left stick
    if (Math.abs(this.gamepadAxes.x) > 0.15) x += this.gamepadAxes.x;
    if (Math.abs(this.gamepadAxes.y) > 0.15) y += this.gamepadAxes.y;

    // Touch joystick
    if (this.touchJoystick.active) {
      x += this.touchJoystick.x;
      y += this.touchJoystick.y;
    }

    // Normalize
    const len = Math.sqrt(x * x + y * y);
    if (len > 1) { x /= len; y /= len; }

    this.axes.x = x;
    this.axes.y = y;
    return { x, y };
  }

  // ─── GAMEPAD ───────────────────────────────────
  _pollGamepad() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];
    if (!gp) return;

    this.gamepadAxes.x = gp.axes[0] || 0;
    this.gamepadAxes.y = gp.axes[1] || 0;

    this._prevGamepadButtons = { ...this.gamepadButtons };
    for (let i = 0; i < gp.buttons.length; i++) {
      this.gamepadButtons[i] = gp.buttons[i].pressed;
    }
  }

  // ─── UPDATE (call once per frame) ──────────────
  update() {
    // Compute just pressed / released
    for (const code in this._keys) {
      this._keysJustPressed[code] = this._keys[code] && !this._prevKeys[code];
      this._keysJustReleased[code] = !this._keys[code] && this._prevKeys[code];
    }
    this._prevKeys = { ...this._keys };

    // Poll gamepad
    this._pollGamepad();
  }
}
