/**
 * NovaStar Auto-Updater (crash-proof)
 * Every single method is wrapped in try-catch.
 * This module will NEVER crash the app.
 */

const { app, dialog, BrowserWindow, ipcMain } = require('electron');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Read version from package.json so it's always in sync
let CURRENT_VERSION = '0.2.4';
try {
  const pkgPath = path.join(__dirname, '..', 'package.json');
  if (fs.existsSync(pkgPath)) {
    CURRENT_VERSION = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')).version || CURRENT_VERSION;
  }
} catch (e) {
  // Fallback to hardcoded version
}

class AutoUpdater {
  constructor(options = {}) {
    try {
      this.currentVersion = CURRENT_VERSION;
      this.githubRepo = options.githubRepo || null;
      this.checkInterval = options.checkInterval || 2 * 60 * 60 * 1000;
      this._updateInfo = null;
      this._downloadPath = null;
      this._checking = false;
      this._intervalId = null;
      this._ipcReady = false;
    } catch (e) {
      console.error('[AutoUpdater] Constructor error:', e.message);
    }
  }

  /**
   * Setup IPC - must be called AFTER app is ready
   */
  setupIPC() {
    try {
      if (this._ipcReady) return;
      this._ipcReady = true;
      ipcMain.handle('updater:check', async () => { try { return await this.checkForUpdates(); } catch(e) { return null; } });
      ipcMain.handle('updater:download', async () => { try { return await this.downloadUpdate(); } catch(e) { return false; } });
      ipcMain.handle('updater:install', async () => { try { return await this.installUpdate(); } catch(e) { return false; } });
      ipcMain.handle('updater:getVersion', () => this.currentVersion);
      ipcMain.handle('updater:getUpdateInfo', () => this._updateInfo);
    } catch (e) {
      console.error('[AutoUpdater] IPC setup error:', e.message);
    }
  }

  /**
   * Start periodic checking (completely safe)
   */
  startAutoCheck() {
    try {
      this.setupIPC();
      // Delay first check by 30 seconds to let the app fully load
      setTimeout(() => {
        this.checkForUpdates(true).catch(() => {});
      }, 30000);

      this._intervalId = setInterval(() => {
        this.checkForUpdates(true).catch(() => {});
      }, this.checkInterval);
    } catch (e) {
      console.error('[AutoUpdater] startAutoCheck error:', e.message);
    }
  }

  stopAutoCheck() {
    try {
      if (this._intervalId) { clearInterval(this._intervalId); this._intervalId = null; }
    } catch (e) {}
  }

  /**
   * Check GitHub for updates (silent = no dialog if up to date)
   */
  async checkForUpdates(silent = false) {
    if (this._checking || !this.githubRepo) return null;
    this._checking = true;

    try {
      const release = await this._fetchLatestRelease();
      if (!release) {
        this._checking = false;
        if (!silent) this._showNoUpdateDialog();
        return null;
      }

      const latestVersion = (release.tag_name || '').replace(/^v/, '');
      if (!this._isNewer(latestVersion, this.currentVersion)) {
        this._checking = false;
        if (!silent) this._showNoUpdateDialog();
        return null;
      }

      // Find download asset
      const assets = release.assets || [];
      const exeAsset = assets.find(a => /\.exe$/i.test(a.name));

      this._updateInfo = {
        version: latestVersion,
        releaseNotes: release.body || 'No release notes.',
        downloadUrl: exeAsset ? exeAsset.browser_download_url : null,
        fileName: exeAsset ? exeAsset.name : null,
        htmlUrl: release.html_url,
      };

      // Notify windows
      try {
        BrowserWindow.getAllWindows().forEach(win => {
          if (!win.isDestroyed()) win.webContents.send('updater:update-available', this._updateInfo);
        });
      } catch (e) {}

      // Show dialog
      const result = await dialog.showMessageBox({
        type: 'info',
        title: 'Update Available',
        message: `NovaStar Engine v${latestVersion} is available!`,
        detail: `You have v${this.currentVersion}.\n\n${this._updateInfo.releaseNotes}`,
        buttons: this._updateInfo.downloadUrl ? ['Download and Install', 'Later'] : ['Open Release Page', 'Later'],
        defaultId: 0, cancelId: 1,
      });

      this._checking = false;

      if (result.response === 0) {
        if (this._updateInfo.downloadUrl) {
          await this.downloadUpdate();
          await this.installUpdate();
        } else if (this._updateInfo.htmlUrl) {
          require('electron').shell.openExternal(this._updateInfo.htmlUrl);
        }
      }

      return this._updateInfo;
    } catch (e) {
      console.error('[AutoUpdater] Check error:', e.message);
      this._checking = false;
      return null;
    }
  }

  _showNoUpdateDialog() {
    try {
      dialog.showMessageBox({
        type: 'info', title: 'No Updates',
        message: 'You are running the latest version!',
        detail: `Current version: v${this.currentVersion}`,
        buttons: ['OK']
      });
    } catch (e) {}
  }

  /**
   * Fetch latest release from GitHub API
   */
  _fetchLatestRelease() {
    return new Promise((resolve) => {
      try {
        const options = {
          hostname: 'api.github.com',
          path: `/repos/${this.githubRepo}/releases/latest`,
          headers: { 'User-Agent': 'NovaStar-Engine-Updater' },
          timeout: 10000,
        };

        const req = https.get(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              console.error('[AutoUpdater] JSON parse error:', e.message);
              resolve(null);
            }
          });
          res.on('error', () => resolve(null));
        });

        req.on('error', (e) => {
          console.error('[AutoUpdater] Network error:', e.message);
          resolve(null);
        });

        req.on('timeout', () => {
          req.destroy();
          resolve(null);
        });
      } catch (e) {
        resolve(null);
      }
    });
  }

  /**
   * Download the update installer
   */
  async downloadUpdate() {
    try {
      if (!this._updateInfo || !this._updateInfo.downloadUrl) return false;

      const tmpDir = path.join(app.getPath('temp'), 'novastar-updates');
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

      const fileName = this._updateInfo.fileName || `NovaStar-Setup-${this._updateInfo.version}.exe`;
      this._downloadPath = path.join(tmpDir, fileName);

      return new Promise((resolve) => {
        try {
          const download = (url) => {
            https.get(url, (res) => {
              if (res.statusCode === 302 || res.statusCode === 301) {
                download(res.headers.location);
                return;
              }

              const file = fs.createWriteStream(this._downloadPath);
              const total = parseInt(res.headers['content-length'], 10) || 0;
              let downloaded = 0;

              res.on('data', (chunk) => {
                downloaded += chunk.length;
                try {
                  BrowserWindow.getAllWindows().forEach(win => {
                    if (!win.isDestroyed()) {
                      win.webContents.send('updater:download-progress', {
                        progress: total > 0 ? downloaded / total : 0,
                        downloaded, total,
                      });
                    }
                  });
                } catch (e) {}
              });

              res.pipe(file);
              file.on('finish', () => { file.close(); resolve(true); });
              file.on('error', () => resolve(false));
            }).on('error', () => resolve(false));
          };

          download(this._updateInfo.downloadUrl);
        } catch (e) {
          resolve(false);
        }
      });
    } catch (e) {
      console.error('[AutoUpdater] Download error:', e.message);
      return false;
    }
  }

  /**
   * Install the update - opens the download location instead of spawning directly
   */
  async installUpdate() {
    try {
      if (!this._downloadPath || !fs.existsSync(this._downloadPath)) {
        // No downloaded file - just open the releases page
        if (this._updateInfo && this._updateInfo.htmlUrl) {
          require('electron').shell.openExternal(this._updateInfo.htmlUrl);
        }
        return false;
      }

      const result = await dialog.showMessageBox({
        type: 'question', title: 'Install Update',
        message: 'The update has been downloaded.',
        detail: `File: ${path.basename(this._downloadPath)}\n\nThe installer will open. Please close NovaStar before running it.`,
        buttons: ['Open Installer Location', 'Later'], defaultId: 0, cancelId: 1,
      });

      if (result.response !== 0) return false;

      // Show the file in Explorer instead of running it directly
      require('electron').shell.showItemInFolder(this._downloadPath);
      return true;
    } catch (e) {
      console.error('[AutoUpdater] Install error:', e.message);
      // Fallback: open releases page
      try {
        if (this._updateInfo && this._updateInfo.htmlUrl) {
          require('electron').shell.openExternal(this._updateInfo.htmlUrl);
        }
      } catch (e2) {}
      return false;
    }
  }

  /**
   * Compare semver: is latest newer than current?
   */
  _isNewer(latest, current) {
    try {
      const l = (latest || '0.0.0').split('.').map(Number);
      const c = (current || '0.0.0').split('.').map(Number);
      for (let i = 0; i < 3; i++) {
        if ((l[i] || 0) > (c[i] || 0)) return true;
        if ((l[i] || 0) < (c[i] || 0)) return false;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
}

module.exports = { AutoUpdater };
