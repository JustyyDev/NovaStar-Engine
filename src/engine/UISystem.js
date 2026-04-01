/**
 * NovaStar UI System
 * In-game HUD, health bars, text, buttons, panels, menus
 * Renders as HTML overlay — no Canvas2D needed
 */

export class UISystem {
  constructor(engine) {
    this.engine = engine;
    this.elements = new Map();
    this._idCounter = 0;

    // Create UI overlay container
    this.container = document.createElement('div');
    this.container.id = 'novastar-ui';
    this.container.style.cssText = `
      position: fixed; inset: 0; z-index: 50;
      pointer-events: none; overflow: hidden;
      font-family: 'Nunito', 'Segoe UI', sans-serif;
    `;
    document.body.appendChild(this.container);
  }

  // ─── CORE ELEMENT CREATION ─────────────────────
  _createElement(type, options = {}) {
    const id = `nova-ui-${++this._idCounter}`;
    const el = document.createElement('div');
    el.id = id;
    el.dataset.novaUi = type;

    if (options.interactive) {
      el.style.pointerEvents = 'auto';
    }

    if (options.position) {
      el.style.position = 'absolute';
      if (options.position === 'center') {
        el.style.left = '50%';
        el.style.top = '50%';
        el.style.transform = 'translate(-50%, -50%)';
      } else {
        if (options.position.top !== undefined) el.style.top = options.position.top;
        if (options.position.bottom !== undefined) el.style.bottom = options.position.bottom;
        if (options.position.left !== undefined) el.style.left = options.position.left;
        if (options.position.right !== undefined) el.style.right = options.position.right;
      }
    }

    this.container.appendChild(el);

    const uiElement = {
      id, el, type,
      show: () => { el.style.display = ''; return uiElement; },
      hide: () => { el.style.display = 'none'; return uiElement; },
      destroy: () => { el.remove(); this.elements.delete(id); },
      setStyle: (styles) => { Object.assign(el.style, styles); return uiElement; },
      addClass: (cls) => { el.classList.add(cls); return uiElement; },
      removeClass: (cls) => { el.classList.remove(cls); return uiElement; },
    };

    this.elements.set(id, uiElement);
    return uiElement;
  }

  // ─── TEXT LABEL ────────────────────────────────
  text(content, options = {}) {
    const {
      fontSize = '16px', color = '#ffffff', fontWeight = '700',
      fontFamily = "'Fredoka One', 'Nunito', sans-serif",
      shadow = true, ...rest
    } = options;

    const elem = this._createElement('text', rest);
    elem.el.textContent = content;
    elem.el.style.cssText += `
      font-size: ${fontSize}; color: ${color};
      font-weight: ${fontWeight}; font-family: ${fontFamily};
      ${shadow ? 'text-shadow: 0 2px 8px rgba(0,0,0,0.5);' : ''}
    `;

    elem.setText = (text) => { elem.el.textContent = text; return elem; };
    return elem;
  }

  // ─── HEALTH BAR ────────────────────────────────
  healthBar(options = {}) {
    const {
      width = '200px', height = '20px',
      bgColor = 'rgba(0,0,0,0.5)', fillColor = '#5ff59a',
      lowColor = '#ff4444', medColor = '#ffaa33',
      border = true, animated = true, value = 1,
      label = '', ...rest
    } = options;

    const elem = this._createElement('healthbar', rest);
    elem.el.style.cssText += `width: ${width};`;
    elem.el.innerHTML = `
      <div style="
        display: flex; align-items: center; gap: 8px;
      ">
        ${label ? `<span style="color: #fff; font-size: 12px; font-weight: 700; font-family: 'Fredoka One', sans-serif; text-shadow: 0 1px 4px rgba(0,0,0,0.5);">${label}</span>` : ''}
        <div style="
          flex: 1; height: ${height}; background: ${bgColor};
          border-radius: ${parseInt(height) / 2}px;
          ${border ? 'border: 2px solid rgba(255,255,255,0.15);' : ''}
          overflow: hidden; position: relative;
        ">
          <div class="nova-bar-fill" style="
            height: 100%; width: ${value * 100}%;
            background: ${fillColor};
            border-radius: inherit;
            ${animated ? 'transition: width 0.3s ease, background 0.3s ease;' : ''}
          "></div>
          <div style="
            position: absolute; top: 0; left: 0; right: 0;
            height: 40%; background: rgba(255,255,255,0.15);
            border-radius: inherit;
          "></div>
        </div>
      </div>
    `;

    elem.setValue = (v) => {
      const fill = elem.el.querySelector('.nova-bar-fill');
      if (!fill) return elem;
      const clamped = Math.max(0, Math.min(1, v));
      fill.style.width = (clamped * 100) + '%';
      if (clamped < 0.25) fill.style.background = lowColor;
      else if (clamped < 0.5) fill.style.background = medColor;
      else fill.style.background = fillColor;
      return elem;
    };

    return elem;
  }

  // ─── BUTTON ────────────────────────────────────
  button(text, onClick, options = {}) {
    const {
      width = 'auto', padding = '12px 28px',
      bgColor = '#5ff59a', textColor = '#0a2a1e',
      fontSize = '16px', borderRadius = '50px',
      ...rest
    } = options;

    const elem = this._createElement('button', { interactive: true, ...rest });
    elem.el.innerHTML = `<button style="
      font-family: 'Fredoka One', sans-serif; font-size: ${fontSize};
      background: ${bgColor}; color: ${textColor};
      border: none; border-radius: ${borderRadius};
      padding: ${padding}; cursor: pointer; width: ${width};
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
      transition: transform 0.15s, box-shadow 0.15s;
    ">${text}</button>`;

    const btn = elem.el.querySelector('button');
    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.05)';
      btn.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)';
      btn.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
    });
    btn.addEventListener('click', onClick);

    elem.setText = (t) => { btn.textContent = t; return elem; };
    return elem;
  }

  // ─── PANEL / CONTAINER ─────────────────────────
  panel(options = {}) {
    const {
      width = 'auto', height = 'auto',
      padding = '20px', bgColor = 'rgba(0,0,0,0.6)',
      borderRadius = '16px', blur = true,
      ...rest
    } = options;

    const elem = this._createElement('panel', { interactive: true, ...rest });
    elem.el.style.cssText += `
      width: ${width}; height: ${height}; padding: ${padding};
      background: ${bgColor}; border-radius: ${borderRadius};
      border: 1px solid rgba(255,255,255,0.1);
      ${blur ? 'backdrop-filter: blur(12px);' : ''}
    `;

    elem.addChild = (childElem) => {
      elem.el.appendChild(childElem.el);
      return elem;
    };
    return elem;
  }

  // ─── NOTIFICATION / TOAST ──────────────────────
  toast(message, options = {}) {
    const { duration = 2000, color = '#5ff59a' } = options;

    const elem = this._createElement('toast', {
      position: { top: '80px', left: '50%' }
    });
    elem.el.style.cssText += `
      transform: translateX(-50%) translateY(-20px);
      background: rgba(0,0,0,0.7); color: ${color};
      padding: 10px 24px; border-radius: 30px;
      font-family: 'Fredoka One', sans-serif; font-size: 16px;
      border: 1px solid ${color}33;
      backdrop-filter: blur(8px);
      opacity: 0; transition: opacity 0.3s, transform 0.3s;
      text-shadow: 0 0 10px ${color}44;
    `;
    elem.el.textContent = message;

    requestAnimationFrame(() => {
      elem.el.style.opacity = '1';
      elem.el.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
      elem.el.style.opacity = '0';
      elem.el.style.transform = 'translateX(-50%) translateY(-20px)';
      setTimeout(() => elem.destroy(), 300);
    }, duration);

    return elem;
  }

  // ─── DIALOGUE BOX ──────────────────────────────
  dialogue(speaker, text, options = {}) {
    const { portrait = null, onComplete = null } = options;

    const elem = this._createElement('dialogue', {
      interactive: true,
      position: { bottom: '40px', left: '50%' }
    });
    elem.el.style.cssText += `
      transform: translateX(-50%);
      width: min(600px, 90vw); padding: 20px 24px;
      background: rgba(10,15,30,0.85);
      border-radius: 16px; border: 2px solid rgba(255,255,255,0.1);
      backdrop-filter: blur(16px);
    `;

    elem.el.innerHTML = `
      <div style="display: flex; gap: 16px; align-items: flex-start;">
        ${portrait ? `<div style="width: 60px; height: 60px; border-radius: 12px; background: rgba(255,255,255,0.1); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 32px;">${portrait}</div>` : ''}
        <div style="flex: 1;">
          <div style="font-family: 'Fredoka One', sans-serif; font-size: 14px; color: #5ff59a; margin-bottom: 4px;">${speaker}</div>
          <div class="nova-dialogue-text" style="color: #ddd; font-size: 15px; line-height: 1.5;"></div>
        </div>
      </div>
      <div style="text-align: right; margin-top: 8px; color: rgba(255,255,255,0.3); font-size: 11px;">Click to continue ▶</div>
    `;

    // Typewriter effect
    const textEl = elem.el.querySelector('.nova-dialogue-text');
    let charIndex = 0;
    const typeInterval = setInterval(() => {
      if (charIndex < text.length) {
        textEl.textContent += text[charIndex];
        charIndex++;
      } else {
        clearInterval(typeInterval);
      }
    }, 30);

    elem.el.addEventListener('click', () => {
      if (charIndex < text.length) {
        clearInterval(typeInterval);
        textEl.textContent = text;
        charIndex = text.length;
      } else {
        elem.destroy();
        if (onComplete) onComplete();
      }
    });

    return elem;
  }

  // ─── SCREEN FADE ───────────────────────────────
  fade(options = {}) {
    const { color = '#000', duration = 500, direction = 'in' } = options;
    return new Promise(resolve => {
      const elem = this._createElement('fade', { position: { top: '0', left: '0' } });
      elem.el.style.cssText += `
        width: 100vw; height: 100vh;
        background: ${color};
        opacity: ${direction === 'in' ? 0 : 1};
        transition: opacity ${duration}ms ease;
      `;
      requestAnimationFrame(() => {
        elem.el.style.opacity = direction === 'in' ? 1 : 0;
      });
      setTimeout(() => {
        if (direction === 'out') elem.destroy();
        resolve(elem);
      }, duration);
    });
  }

  // ─── CLEANUP ───────────────────────────────────
  clear() {
    for (const elem of this.elements.values()) elem.destroy();
    this.elements.clear();
  }
}
