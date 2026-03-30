/**
 * NovaStar Auto-Updater
 * Checks for updates and applies them automatically
 * 
 * Supports two update modes:
 * 1. GitHub Releases (free, for open-source projects)
 * 2. Custom server (for private distribution)
 */

const { app, dialog, BrowserWindow, ipcMain } = require('electron');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

class AutoUpdater {
  constructor(options = {}) {
    this.currentVersion = app.getVersion();
    this.updateUrl = options.updateUrl || null;
    this.githubRepo = options.githubRepo || null; // e.g. 'username/novastar-engine'
    this.checkInterval = options.checkInterval || 60 * 60 * 1000; // 1 hour
    this.autoDownload = options.autoDownload ?? true;
    this.autoInstall = options.autoInstall ?? false;

    this._updateInfo = null;
    this._downloadPath = null;
    this._checking = false;
    this._intervalId = null;

    // IPC handlers for renderer communication
    this._setupIPC();
  }

  _setupIPC() {
    ipcMain.handle('updater:check', () => this.checkForUpdates());
    ipcMain.handle('updater:download', () => this.downloadUpdate());
    ipcMain.handle('updater:install', () => this.installUpdate());
    ipcMain.handle('updater:getVersion', () => this.currentVersion);
    ipcMain.handle('updater:getUpdateInfo', () => this._updateInfo);
  }

  /**
   * Start periodic update checking
   */
  startAutoCheck() {
    // Check immediately on startup (after a short delay)
    setTimeout(() => this.checkForUpdates(true), 10000);

    // Then check periodically
    this._intervalId = setInterval(() => {
      this.checkForUpdates(true);
    }, this.checkInterval);
  }

  stopAutoCheck() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  /**
   * Check for updates
   * @param {boolean} silent - Don't show dialogs if no update available
   */
  async checkForUpdates(silent = false) {
    if (this._checking) return null;
    this._checking = true;

    try {
      let updateInfo = null;

      if (this.githubRepo) {
        updateInfo = await this._checkGitHub();
      } else if (this.updateUrl) {
        updateInfo = await this._checkCustomServer();
      } else {
        console.log('[AutoUpdater] No update source configured');
        this._checking = false;
        return null;
      }

      if (!updateInfo) {
        if (!silent) {
          dialog.showMessageBox({
            type: 'info',
            title: 'No Updates',
            message: 'You\'re running the latest version!',
            detail: `Current version: v${this.currentVersion}`,
            buttons: ['OK']
          });
        }
        this._checking = false;
        return null;
      }

      this._updateInfo = updateInfo;

      // Notify all windows
      BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('updater:update-available', updateInfo);
      });

      // Show update dialog
      const result = await dialog.showMessageBox({
        type: 'info',
        title: 'Update Available',
        message: `NovaStar Engine v${updateInfo.version} is available!`,
        detail: [
          `Current version: v${this.currentVersion}`,
          `New version: v${updateInfo.version}`,
          '',
          updateInfo.releaseNotes || 'No release notes available.',
        ].join('\n'),
        buttons: ['Download & Install', 'Later'],
        defaultId: 0,
        cancelId: 1,
      });

      if (result.response === 0) {
        await this.downloadUpdate();
        await this.installUpdate();
      }

      this._checking = false;
      return updateInfo;

    } catch (err) {
      console.error('[AutoUpdater] Check failed:', err.message);
      this._checking = false;
      return null;
    }
  }

  /**
   * Check GitHub releases for updates
   */
  _checkGitHub() {
    return new Promise((resolve, reject) => {
      const url = `https://api.github.com/repos/${this.githubRepo}/releases/latest`;

      const options = {
        hostname: 'api.github.com',
        path: `/repos/${this.githubRepo}/releases/latest`,
        headers: { 'User-Agent': 'NovaStar-Engine-Updater' }
      };

      https.get(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const release = JSON.parse(data);
            const latestVersion = release.tag_name.replace(/^v/, '');

            if (this._isNewer(latestVersion, this.currentVersion)) {
              // Find the right asset for this platform
              const platform = process.platform;
              const arch = process.arch;
              let assetPattern;

              if (platform === 'win32') {
                assetPattern = /setup.*\.exe$/i;
              } else if (platform === 'darwin') {
                assetPattern = arch === 'arm64' ? /arm64.*\.dmg$/i : /x64.*\.dmg$/i;
              } else {
                assetPattern = /\.appimage$/i;
              }

              const asset = release.assets.find(a => assetPattern.test(a.name));

              resolve({
                version: latestVersion,
                releaseNotes: release.body,
                downloadUrl: asset ? asset.browser_download_url : null,
                fileName: asset ? asset.name : null,
                publishedAt: release.published_at,
                htmlUrl: release.html_url,
              });
            } else {
              resolve(null); // No update
            }
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Check a custom update server
   * Expected response: { version, downloadUrl, releaseNotes }
   */
  _checkCustomServer() {
    return new Promise((resolve, reject) => {
      const url = new URL(this.updateUrl);
      const client = url.protocol === 'https:' ? https : http;

      const params = new URLSearchParams({
        version: this.currentVersion,
        platform: process.platform,
        arch: process.arch,
      });

      client.get(`${this.updateUrl}?${params}`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const info = JSON.parse(data);
            if (info.version && this._isNewer(info.version, this.currentVersion)) {
              resolve(info);
            } else {
              resolve(null);
            }
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Download the update
   */
  async downloadUpdate() {
    if (!this._updateInfo || !this._updateInfo.downloadUrl) {
      console.error('[AutoUpdater] No download URL available');
      return false;
    }

    const downloadDir = path.join(app.getPath('temp'), 'novastar-updates');
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    const fileName = this._updateInfo.fileName || `NovaStar-Setup-${this._updateInfo.version}.exe`;
    this._downloadPath = path.join(downloadDir, fileName);

    // Notify progress
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('updater:download-start', this._updateInfo);
    });

    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(this._downloadPath);
      const client = this._updateInfo.downloadUrl.startsWith('https') ? https : http;

      const download = (url) => {
        client.get(url, (res) => {
          // Handle redirects
          if (res.statusCode === 302 || res.statusCode === 301) {
            download(res.headers.location);
            return;
          }

          const totalSize = parseInt(res.headers['content-length'], 10);
          let downloaded = 0;

          res.on('data', (chunk) => {
            downloaded += chunk.length;
            const progress = totalSize ? downloaded / totalSize : 0;

            BrowserWindow.getAllWindows().forEach(win => {
              win.webContents.send('updater:download-progress', {
                progress,
                downloaded,
                total: totalSize,
              });
            });
          });

          res.pipe(file);

          file.on('finish', () => {
            file.close();

            BrowserWindow.getAllWindows().forEach(win => {
              win.webContents.send('updater:download-complete', this._downloadPath);
            });

            resolve(true);
          });
        }).on('error', (err) => {
          fs.unlink(this._downloadPath, () => {});
          reject(err);
        });
      };

      download(this._updateInfo.downloadUrl);
    });
  }

  /**
   * Install the update (runs the installer and quits the app)
   */
  async installUpdate() {
    if (!this._downloadPath || !fs.existsSync(this._downloadPath)) {
      console.error('[AutoUpdater] No downloaded update found');
      return false;
    }

    const result = await dialog.showMessageBox({
      type: 'question',
      title: 'Install Update',
      message: 'Ready to install the update. The application will restart.',
      buttons: ['Install & Restart', 'Later'],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response !== 0) return false;

    // Launch the installer
    if (process.platform === 'win32') {
      spawn(this._downloadPath, ['/S'], {
        detached: true,
        stdio: 'ignore',
      }).unref();
    } else if (process.platform === 'darwin') {
      spawn('open', [this._downloadPath], {
        detached: true,
        stdio: 'ignore',
      }).unref();
    }

    // Quit the app so the installer can replace files
    app.quit();
    return true;
  }

  /**
   * Compare semantic versions
   */
  _isNewer(latest, current) {
    const parse = (v) => v.split('.').map(Number);
    const l = parse(latest);
    const c = parse(current);
    for (let i = 0; i < 3; i++) {
      if ((l[i] || 0) > (c[i] || 0)) return true;
      if ((l[i] || 0) < (c[i] || 0)) return false;
    }
    return false;
  }
}

module.exports = { AutoUpdater };
