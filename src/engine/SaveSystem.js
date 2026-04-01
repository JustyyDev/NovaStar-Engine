/**
 * NovaStar Save System
 * Persistent game data, save slots, player preferences
 */

export class SaveSystem {
  constructor(gameId = 'novastar-game') {
    this.gameId = gameId;
    this._prefix = `nova_${gameId}_`;
  }

  // ─── SAVE SLOTS ────────────────────────────────
  /**
   * Save game data to a slot
   */
  save(slot, data) {
    const saveData = {
      _meta: {
        slot,
        timestamp: Date.now(),
        date: new Date().toISOString(),
        version: '0.1',
      },
      data
    };
    try {
      localStorage.setItem(this._prefix + `save_${slot}`, JSON.stringify(saveData));
      return true;
    } catch (e) {
      console.error('[NovaStar Save] Failed to save:', e);
      return false;
    }
  }

  /**
   * Load game data from a slot
   */
  load(slot) {
    try {
      const raw = localStorage.getItem(this._prefix + `save_${slot}`);
      if (!raw) return null;
      const saveData = JSON.parse(raw);
      return saveData.data;
    } catch (e) {
      console.error('[NovaStar Save] Failed to load:', e);
      return null;
    }
  }

  /**
   * Check if a save slot exists
   */
  exists(slot) {
    return localStorage.getItem(this._prefix + `save_${slot}`) !== null;
  }

  /**
   * Get save metadata (timestamp, etc.)
   */
  getMeta(slot) {
    try {
      const raw = localStorage.getItem(this._prefix + `save_${slot}`);
      if (!raw) return null;
      return JSON.parse(raw)._meta;
    } catch { return null; }
  }

  /**
   * Delete a save slot
   */
  delete(slot) {
    localStorage.removeItem(this._prefix + `save_${slot}`);
  }

  /**
   * List all save slots
   */
  listSlots() {
    const slots = [];
    const prefix = this._prefix + 'save_';
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(prefix)) {
        const slot = key.substring(prefix.length);
        const meta = this.getMeta(slot);
        slots.push({ slot, meta });
      }
    }
    return slots.sort((a, b) => (b.meta?.timestamp || 0) - (a.meta?.timestamp || 0));
  }

  // ─── KEY-VALUE STORAGE ─────────────────────────
  /**
   * Set a persistent value (settings, unlocks, etc.)
   */
  set(key, value) {
    localStorage.setItem(this._prefix + key, JSON.stringify(value));
  }

  /**
   * Get a persistent value
   */
  get(key, defaultValue = null) {
    const raw = localStorage.getItem(this._prefix + key);
    if (raw === null) return defaultValue;
    try { return JSON.parse(raw); } catch { return defaultValue; }
  }

  /**
   * Remove a persistent value
   */
  remove(key) {
    localStorage.removeItem(this._prefix + key);
  }

  // ─── SETTINGS ──────────────────────────────────
  /**
   * Save game settings
   */
  saveSettings(settings) {
    this.set('settings', settings);
  }

  /**
   * Load game settings with defaults
   */
  loadSettings(defaults = {}) {
    return { ...defaults, ...this.get('settings', {}) };
  }

  // ─── EXPORT / IMPORT ───────────────────────────
  /**
   * Export all save data as a JSON string (for backup)
   */
  exportAll() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(this._prefix)) {
        data[key] = localStorage.getItem(key);
      }
    }
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import save data from a JSON string
   */
  importAll(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      for (const [key, value] of Object.entries(data)) {
        if (key.startsWith(this._prefix)) {
          localStorage.setItem(key, value);
        }
      }
      return true;
    } catch (e) {
      console.error('[NovaStar Save] Import failed:', e);
      return false;
    }
  }

  /**
   * Clear all save data for this game
   */
  clearAll() {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(this._prefix)) toRemove.push(key);
    }
    toRemove.forEach(k => localStorage.removeItem(k));
  }
}
