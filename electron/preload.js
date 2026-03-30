/**
 * NovaStar Engine — Electron Preload
 * Exposes safe native APIs to the editor
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('novastarDesktop', {
  // ─── Platform info ─────────────────────────
  platform: process.platform,
  isDesktop: true,
  version: '0.1.0',

  // ─── File dialogs ──────────────────────────
  saveDialog: (defaultPath) => ipcRenderer.invoke('dialog:save', defaultPath),
  openDialog: () => ipcRenderer.invoke('dialog:open'),

  // ─── File system ───────────────────────────
  readFile: (path) => ipcRenderer.invoke('fs:read', path),
  writeFile: (path, data) => ipcRenderer.invoke('fs:write', path, data),

  // ─── App paths ─────────────────────────────
  getPath: (name) => ipcRenderer.invoke('app:getPath', name),

  // ─── Menu event listeners ──────────────────
  onMenuEvent: (channel, callback) => {
    const validChannels = [
      'menu:new-scene', 'menu:open-scene', 'menu:save-scene',
      'menu:save-scene-as', 'menu:undo', 'menu:redo',
      'menu:select-all', 'menu:delete', 'menu:preferences',
      'menu:toggle-play', 'menu:toggle-panel', 'menu:reset-layout',
      'menu:add-entity', 'menu:build', 'menu:build-settings',
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },

  // ─── Remove listeners ──────────────────────
  removeMenuListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
