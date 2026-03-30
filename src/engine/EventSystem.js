/**
 * NovaStar Event System
 * Global event bus for decoupled communication between game systems
 */

export class EventSystem {
  constructor() {
    this._listeners = new Map();
    this._onceListeners = new Map();
  }

  /**
   * Listen for an event
   * @returns {function} Unsubscribe function
   */
  on(event, callback) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  /**
   * Listen for an event once
   */
  once(event, callback) {
    if (!this._onceListeners.has(event)) this._onceListeners.set(event, []);
    this._onceListeners.get(event).push(callback);
    return () => {
      const arr = this._onceListeners.get(event);
      if (arr) {
        const i = arr.indexOf(callback);
        if (i !== -1) arr.splice(i, 1);
      }
    };
  }

  /**
   * Remove a listener
   */
  off(event, callback) {
    const arr = this._listeners.get(event);
    if (arr) {
      const i = arr.indexOf(callback);
      if (i !== -1) arr.splice(i, 1);
    }
  }

  /**
   * Emit an event with data
   */
  emit(event, ...args) {
    // Regular listeners
    const listeners = this._listeners.get(event);
    if (listeners) {
      for (const cb of [...listeners]) cb(...args);
    }

    // Once listeners
    const onceListeners = this._onceListeners.get(event);
    if (onceListeners) {
      for (const cb of onceListeners) cb(...args);
      this._onceListeners.delete(event);
    }
  }

  /**
   * Remove all listeners for an event (or all events)
   */
  clear(event) {
    if (event) {
      this._listeners.delete(event);
      this._onceListeners.delete(event);
    } else {
      this._listeners.clear();
      this._onceListeners.clear();
    }
  }

  /**
   * Get count of listeners for an event
   */
  listenerCount(event) {
    return (this._listeners.get(event)?.length || 0) +
           (this._onceListeners.get(event)?.length || 0);
  }
}
