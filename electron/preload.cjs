/**
 * NovaStar Engine — Electron Preload
 * Exposes safe native APIs to the editor
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('novastarDesktop', {
  // ─── Platform info ─────────────────────────
  platform: process.platform,
  isDesktop: true,
  version: '0.5.0',

  // ─── File dialogs ──────────────────────────
  saveDialog: (defaultPath) => ipcRenderer.invoke('dialog:save', defaultPath),
  openDialog: () => ipcRenderer.invoke('dialog:open'),

  // ─── File system ───────────────────────────
  readFile: (path) => ipcRenderer.invoke('fs:read', path),
  writeFile: (path, data) => ipcRenderer.invoke('fs:write', path, data),
  ensureDir: (path) => ipcRenderer.invoke('fs:ensureDir', path),
  listDir: (path) => ipcRenderer.invoke('fs:listDir', path),

  // ─── Project folders ───────────────────────
  createProjectFolder: (name) => ipcRenderer.invoke('project:create', name),
  openProjectFolder: () => ipcRenderer.invoke('project:open'),

  // ─── Game Export ─────────────────────────
  exportGameExe: (html, name) => ipcRenderer.invoke('game:export-exe', html, name),
  exportGameWeb: (html, name) => ipcRenderer.invoke('game:export-web', html, name),

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
  },

  // ─── Auto-Updater ─────────────────────────
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater:check'),
    downloadUpdate: () => ipcRenderer.invoke('updater:download'),
    installUpdate: () => ipcRenderer.invoke('updater:install'),
    getVersion: () => ipcRenderer.invoke('updater:getVersion'),
    getUpdateInfo: () => ipcRenderer.invoke('updater:getUpdateInfo'),
    onUpdateAvailable: (cb) => ipcRenderer.on('updater:update-available', (_, info) => cb(info)),
    onDownloadProgress: (cb) => ipcRenderer.on('updater:download-progress', (_, progress) => cb(progress)),
    onDownloadComplete: (cb) => ipcRenderer.on('updater:download-complete', (_, path) => cb(path)),
  }
});
