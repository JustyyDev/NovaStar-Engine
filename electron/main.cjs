/**
 * NovaStar Engine — Electron Main Process
 * Creates the native desktop application window
 */

const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { AutoUpdater } = require('./auto-updater.cjs');

// ─── APP CONFIG ──────────────────────────────────
const IS_DEV = process.argv.includes('--dev');
const APP_NAME = 'NovaStar Engine';
const APP_VERSION = '0.5.0';

let mainWindow = null;
let splashWindow = null;

// ─── AUTO-UPDATER ────────────────────────────────
const updater = new AutoUpdater({
  githubRepo: 'JustyyDev/NovaStar-Engine',
  checkInterval: 2 * 60 * 60 * 1000,
});

// ─── SPLASH SCREEN ───────────────────────────────
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 480,
    height: 360,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.center();
}

// ─── MAIN WINDOW ─────────────────────────────────
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    show: false,
    title: APP_NAME,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    backgroundColor: '#1a1a2e',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    }
  });

  // Load the editor
  if (IS_DEV) {
    mainWindow.loadURL('http://localhost:3000/editor.html');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'editor.html'));
  }

  // Show main window when ready, close splash
  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      if (splashWindow) {
        splashWindow.close();
        splashWindow = null;
      }
      mainWindow.show();
      mainWindow.focus();
    }, IS_DEV ? 500 : 2000);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Build menu
  buildMenu();
}

// ─── APPLICATION MENU ────────────────────────────
function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Scene',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.send('menu:new-scene')
        },
        {
          label: 'Open Scene...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              title: 'Open NovaStar Scene',
              filters: [
                { name: 'NovaStar Scene', extensions: ['novastar', 'json'] },
                { name: 'All Files', extensions: ['*'] }
              ],
              properties: ['openFile']
            });
            if (!result.canceled && result.filePaths.length > 0) {
              const data = fs.readFileSync(result.filePaths[0], 'utf-8');
              mainWindow.webContents.send('menu:open-scene', data, result.filePaths[0]);
            }
          }
        },
        {
          label: 'Save Scene',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow.webContents.send('menu:save-scene')
        },
        {
          label: 'Save Scene As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: async () => {
            const result = await dialog.showSaveDialog(mainWindow, {
              title: 'Save NovaStar Scene',
              defaultPath: 'scene.novastar',
              filters: [
                { name: 'NovaStar Scene', extensions: ['novastar'] },
                { name: 'JSON', extensions: ['json'] }
              ]
            });
            if (!result.canceled) {
              mainWindow.webContents.send('menu:save-scene-as', result.filePath);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Open Project Folder',
          click: () => {
            shell.openPath(app.getPath('userData'));
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'Alt+F4',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: () => mainWindow.webContents.send('menu:undo') },
        { label: 'Redo', accelerator: 'CmdOrCtrl+Shift+Z', click: () => mainWindow.webContents.send('menu:redo') },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { type: 'separator' },
        { label: 'Select All', accelerator: 'CmdOrCtrl+A', click: () => mainWindow.webContents.send('menu:select-all') },
        { label: 'Delete', accelerator: 'Delete', click: () => mainWindow.webContents.send('menu:delete') },
        { type: 'separator' },
        {
          label: 'Preferences...',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow.webContents.send('menu:preferences')
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Play Mode',
          accelerator: 'F5',
          click: () => mainWindow.webContents.send('menu:toggle-play')
        },
        { type: 'separator' },
        { label: 'Toggle Hierarchy', click: () => mainWindow.webContents.send('menu:toggle-panel', 'hierarchy') },
        { label: 'Toggle Inspector', click: () => mainWindow.webContents.send('menu:toggle-panel', 'inspector') },
        { label: 'Toggle Console', click: () => mainWindow.webContents.send('menu:toggle-panel', 'console') },
        { type: 'separator' },
        { label: 'Reset Layout', click: () => mainWindow.webContents.send('menu:reset-layout') },
        { type: 'separator' },
        { label: 'Toggle DevTools', accelerator: 'F12', role: 'toggleDevTools' },
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { type: 'separator' },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+=', role: 'zoomIn' },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { label: 'Reset Zoom', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: 'Fullscreen', accelerator: 'F11', role: 'togglefullscreen' },
      ]
    },
    {
      label: 'Entity',
      submenu: [
        { label: 'Add Platform', click: () => mainWindow.webContents.send('menu:add-entity', 'platform') },
        { label: 'Add Character', click: () => mainWindow.webContents.send('menu:add-entity', 'character') },
        { label: 'Add Star', click: () => mainWindow.webContents.send('menu:add-entity', 'star') },
        { label: 'Add Tree', click: () => mainWindow.webContents.send('menu:add-entity', 'tree') },
        { label: 'Add Enemy', click: () => mainWindow.webContents.send('menu:add-entity', 'enemy') },
        { type: 'separator' },
        { label: 'Add Light', click: () => mainWindow.webContents.send('menu:add-entity', 'light') },
        { label: 'Add Spawn Point', click: () => mainWindow.webContents.send('menu:add-entity', 'spawn') },
        { label: 'Add Trigger Zone', click: () => mainWindow.webContents.send('menu:add-entity', 'trigger') },
      ]
    },
    {
      label: 'Build',
      submenu: [
        {
          label: 'Build for Web',
          accelerator: 'CmdOrCtrl+B',
          click: () => mainWindow.webContents.send('menu:build', 'web')
        },
        {
          label: 'Build for Desktop (Windows)',
          click: () => mainWindow.webContents.send('menu:build', 'windows')
        },
        {
          label: 'Build for Desktop (macOS)',
          click: () => mainWindow.webContents.send('menu:build', 'macos')
        },
        {
          label: 'Build for Desktop (Linux)',
          click: () => mainWindow.webContents.send('menu:build', 'linux')
        },
        { type: 'separator' },
        {
          label: 'Build Settings...',
          click: () => mainWindow.webContents.send('menu:build-settings')
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Check for Updates...',
          click: () => updater.checkForUpdates(false)
        },
        { type: 'separator' },
        {
          label: `About ${APP_NAME}`,
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: `About ${APP_NAME}`,
              message: `${APP_NAME} v${APP_VERSION}`,
              detail: 'A cartoony low-poly 3D game engine\nwith custom scripting language and visual editor.\n\nBuilt for making Nintendo-style games\nwith a futuristic twist.',
              buttons: ['OK']
            });
          }
        },
        { type: 'separator' },
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://github.com/JustyyDev/NovaStar-Engine#readme')
        },
        {
          label: 'Report Issue',
          click: () => shell.openExternal('https://github.com/JustyyDev/NovaStar-Engine/issues')
        },
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ─── IPC HANDLERS ────────────────────────────────
ipcMain.handle('dialog:save', async (event, defaultPath) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath,
    filters: [
      { name: 'NovaStar Scene', extensions: ['novastar'] },
      { name: 'JSON', extensions: ['json'] }
    ]
  });
  return result;
});

ipcMain.handle('dialog:open', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    filters: [
      { name: 'NovaStar Scene', extensions: ['novastar', 'json'] },
      { name: 'NovaScript', extensions: ['nova'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });
  return result;
});

ipcMain.handle('fs:read', async (event, filePath) => {
  return fs.readFileSync(filePath, 'utf-8');
});

ipcMain.handle('fs:write', async (event, filePath, data) => {
  fs.writeFileSync(filePath, data, 'utf-8');
  return true;
});

ipcMain.handle('app:getPath', async (event, name) => {
  return app.getPath(name);
});

// ─── PROJECT FOLDER IPC ─────────────────────────
ipcMain.handle('project:create', async (event, name) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose Project Location',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || !result.filePaths.length) return { canceled: true };
  const projectDir = path.join(result.filePaths[0], name.replace(/[<>:"/\\|?*]/g, '_'));
  // Create project directory structure
  const dirs = ['scenes', 'assets', 'assets/textures', 'assets/audio', 'assets/models', 'scripts', 'prefabs', 'builds'];
  fs.mkdirSync(projectDir, { recursive: true });
  dirs.forEach(d => fs.mkdirSync(path.join(projectDir, d), { recursive: true }));
  return { canceled: false, path: projectDir };
});

ipcMain.handle('project:open', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open NovaStar Project',
    properties: ['openDirectory'],
  });
  if (result.canceled || !result.filePaths.length) return { canceled: true };
  // Verify it's a NovaStar project
  const projFile = path.join(result.filePaths[0], 'project.novastar');
  if (!fs.existsSync(projFile)) {
    dialog.showErrorBox('Not a NovaStar Project', 'The selected folder does not contain a project.novastar file.');
    return { canceled: true };
  }
  return { canceled: false, path: result.filePaths[0] };
});

ipcMain.handle('fs:ensureDir', async (event, dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
  return true;
});

ipcMain.handle('fs:listDir', async (event, dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) return [];
    return fs.readdirSync(dirPath).map(name => {
      const full = path.join(dirPath, name);
      const stat = fs.statSync(full);
      return { name, isDirectory: stat.isDirectory(), size: stat.size };
    });
  } catch { return []; }
});


// ─── GAME EXPORT IPC ────────────────────────────
ipcMain.handle('game:export-exe', async (event, gameHTML, gameName) => {
  // Export a standalone .exe by creating a minimal Electron wrapper
  const exportDir = path.join(app.getPath('documents'), 'NovaStar Exports', gameName.replace(/[<>:"/\\|?*]/g, '_'));
  
  try {
    // Create export directory
    fs.mkdirSync(exportDir, { recursive: true });
    
    // Write the game HTML
    fs.writeFileSync(path.join(exportDir, 'index.html'), gameHTML, 'utf-8');
    
    // Write a minimal package.json for the exported game
    const gamePkg = {
      name: gameName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      version: '1.0.0',
      main: 'main.js',
      description: gameName + ' - Built with NovaStar Engine',
    };
    fs.writeFileSync(path.join(exportDir, 'package.json'), JSON.stringify(gamePkg, null, 2));
    
    // Write a minimal Electron main process for the game
    const gameMain = `
const { app, BrowserWindow } = require('electron');
const path = require('path');
let win;
app.whenReady().then(() => {
  win = new BrowserWindow({
    width: 1280, height: 720,
    title: ${JSON.stringify(gameName)},
    webPreferences: { nodeIntegration: false, contextIsolation: true },
    autoHideMenuBar: true,
  });
  win.loadFile(path.join(__dirname, 'index.html'));
  win.on('closed', () => { win = null; });
});
app.on('window-all-closed', () => app.quit());
`;
    fs.writeFileSync(path.join(exportDir, 'main.js'), gameMain, 'utf-8');
    
    // Write a build script
    const buildScript = `@echo off
echo === NovaStar Game Builder ===
echo.
echo This will build "${gameName}" as a standalone .exe
echo.
echo Step 1: Installing dependencies...
call npm init -y >nul 2>&1
call npm install electron@latest --save-dev >nul 2>&1
call npm install electron-builder@latest --save-dev >nul 2>&1
echo Step 2: Building .exe...
call npx electron-builder --win --config.appId=com.novastar.game --config.productName="${gameName}" --config.directories.output=release --config.files[0]="*.js" --config.files[1]="*.html" --config.files[2]="*.json" --config.win.target=portable
echo.
echo Done! Your .exe is in the release/ folder.
pause
`;
    fs.writeFileSync(path.join(exportDir, 'build-exe.bat'), buildScript, 'utf-8');
    
    // Also write a Linux build script
    const linuxScript = `#!/bin/bash
echo "=== NovaStar Game Builder ==="
echo ""
echo "Building ${gameName} as a standalone application..."
npm init -y > /dev/null 2>&1
npm install electron@latest electron-builder@latest --save-dev > /dev/null 2>&1
npx electron-builder --linux --config.appId=com.novastar.game --config.productName="${gameName}" --config.directories.output=release --config.files[0]="*.js" --config.files[1]="*.html" --config.files[2]="*.json" --config.linux.target=AppImage
echo ""
echo "Done! Your AppImage is in the release/ folder."
`;
    fs.writeFileSync(path.join(exportDir, 'build-linux.sh'), linuxScript, 'utf-8');
    
    // Open the export folder
    shell.openPath(exportDir);
    
    return { success: true, path: exportDir };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('game:export-web', async (event, gameHTML, gameName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Game as HTML',
    defaultPath: gameName.replace(/\s+/g, '_') + '.html',
    filters: [{ name: 'HTML File', extensions: ['html'] }]
  });
  if (result.canceled) return { success: false, error: 'Canceled' };
  try {
    fs.writeFileSync(result.filePath, gameHTML, 'utf-8');
    shell.showItemInFolder(result.filePath);
    return { success: true, path: result.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ─── VERSION MIGRATION ───────────────────────────
// Clear old caches when updating from a previous version
function migrateVersion() {
  try {
    const versionFile = path.join(app.getPath('userData'), '.novastar-version');
    let previousVersion = null;
    try { previousVersion = fs.readFileSync(versionFile, 'utf-8').trim(); } catch(e) {}

    if (previousVersion !== APP_VERSION) {
      console.log(`[NovaStar] Upgrading from ${previousVersion || 'fresh install'} to ${APP_VERSION}`);

      // Clear ALL Electron caches to ensure clean state
      const userDataPath = app.getPath('userData');
      const cacheDirs = ['Cache', 'Code Cache', 'GPUCache', 'Session Storage', 'blob_storage', 'WebStorage', 'Crashpad'];
      cacheDirs.forEach(dir => {
        const p = path.join(userDataPath, dir);
        try { fs.rmSync(p, { recursive: true, force: true }); } catch(e) {}
      });

      // Clear temp updater files
      const tempUpdates = path.join(app.getPath('temp'), 'novastar-updates');
      try { fs.rmSync(tempUpdates, { recursive: true, force: true }); } catch(e) {}

      // Write current version
      try { fs.writeFileSync(versionFile, APP_VERSION); } catch(e) {}

      console.log('[NovaStar] Cache cleared for clean update');
    }
  } catch (e) {
    console.error('[NovaStar] Migration error (non-fatal):', e.message);
  }
}

// ─── APP LIFECYCLE ───────────────────────────────
app.whenReady().then(() => {
  migrateVersion();
  createSplashWindow();
  createMainWindow();

  // Start auto-update checks (not in dev mode)
  if (!IS_DEV) {
    updater.startAutoCheck();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

// Handle certificate errors in dev
if (IS_DEV) {
  app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    event.preventDefault();
    callback(true);
  });
}
