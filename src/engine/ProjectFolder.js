/**
 * NovaStar Project Folder System v0.4.1
 * Manages project folders on the local filesystem via Electron IPC.
 * Projects are stored as folders containing:
 *   project.novastar   - Main project file (JSON)
 *   scenes/            - Scene files (.novascene)
 *   assets/            - Textures, audio, models
 *   scripts/           - NovaScript files (.nova)
 *   prefabs/           - Prefab definitions
 *   builds/            - Export output
 */

export class ProjectFolder {
  constructor() {
    this.isDesktop = !!(typeof window !== 'undefined' && window.novastarDesktop);
    this.projectPath = null;
    this.projectName = 'Untitled Project';
    this._dirty = false;
    this._autosaveInterval = null;
  }

  get isOpen() { return !!this.projectPath; }
  get isDirty() { return this._dirty; }
  markDirty() { this._dirty = true; }
  markClean() { this._dirty = false; }

  /**
   * Create a new project folder
   * @param {string} name - Project name
   * @param {string} template - Template to start from
   * @returns {object} { success, path, error }
   */
  async createProject(name, template = 'blank') {
    if (!this.isDesktop) {
      // Browser fallback: use in-memory project
      this.projectName = name;
      this.projectPath = null;
      return { success: true, path: null, browser: true };
    }

    try {
      // Ask user where to save
      const result = await window.novastarDesktop.createProjectFolder(name);
      if (!result || result.canceled) return { success: false, error: 'Canceled' };

      this.projectPath = result.path;
      this.projectName = name;

      // Create project structure
      const projectData = {
        format: 'novastar-project',
        engineVersion: '0.5.0',
        name,
        template,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        config: {
          resolution: { width: 1280, height: 720 },
          targetFPS: 60,
          physics: { gravity: -25 },
          renderer: { 
            skyColorTop: '#6ec6ff', skyColorBottom: '#b8e8ff',
            enableShadows: true, materialMode: 'toon'
          },
        },
        scenes: ['main'],
        startScene: 'main',
        prefabs: [],
        entities: [],
      };

      await window.novastarDesktop.writeFile(
        result.path + '/project.novastar',
        JSON.stringify(projectData, null, 2)
      );

      this._dirty = false;
      this._startAutosave();
      return { success: true, path: result.path };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Open an existing project
   * @returns {object} { success, data, error }
   */
  async openProject() {
    if (!this.isDesktop) {
      // Browser: use file input
      return this._openBrowser();
    }

    try {
      const result = await window.novastarDesktop.openProjectFolder();
      if (!result || result.canceled) return { success: false, error: 'Canceled' };

      const raw = await window.novastarDesktop.readFile(result.path + '/project.novastar');
      const data = JSON.parse(raw);

      this.projectPath = result.path;
      this.projectName = data.name || 'Untitled';
      this._dirty = false;
      this._startAutosave();

      return { success: true, data, path: result.path };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Save the current project
   * @param {object} projectData - Full project JSON
   * @returns {object} { success, error }
   */
  async saveProject(projectData) {
    projectData.modified = new Date().toISOString();
    projectData.engineVersion = '0.5.0';

    if (!this.isDesktop || !this.projectPath) {
      // Browser fallback: download as file
      return this._saveBrowser(projectData);
    }

    try {
      await window.novastarDesktop.writeFile(
        this.projectPath + '/project.novastar',
        JSON.stringify(projectData, null, 2)
      );

      this._dirty = false;
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Save As — pick a new location
   */
  async saveProjectAs(projectData) {
    if (!this.isDesktop) return this._saveBrowser(projectData);

    try {
      const result = await window.novastarDesktop.saveDialog(this.projectName + '.novastar');
      if (!result || result.canceled) return { success: false, error: 'Canceled' };

      // If they chose a folder, save project.novastar inside it
      const savePath = result.filePath;
      projectData.modified = new Date().toISOString();

      await window.novastarDesktop.writeFile(
        savePath,
        JSON.stringify(projectData, null, 2)
      );

      // Update project path to the directory containing the file
      const dir = savePath.replace(/[/\\][^/\\]*$/, '');
      this.projectPath = dir;
      this._dirty = false;

      return { success: true, path: savePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Save an asset file to the project's assets folder
   */
  async saveAsset(filename, data, subfolder = 'assets') {
    if (!this.isDesktop || !this.projectPath) return false;
    try {
      const dir = `${this.projectPath}/${subfolder}`;
      await window.novastarDesktop.ensureDir(dir);
      await window.novastarDesktop.writeFile(`${dir}/${filename}`, data);
      return true;
    } catch { return false; }
  }

  /**
   * List files in a project subfolder
   */
  async listAssets(subfolder = 'assets') {
    if (!this.isDesktop || !this.projectPath) return [];
    try {
      return await window.novastarDesktop.listDir(`${this.projectPath}/${subfolder}`);
    } catch { return []; }
  }

  // ─── Browser Fallbacks ────────────────────────────────
  _saveBrowser(data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (this.projectName || 'project').replace(/\s+/g, '_') + '.novastar';
    a.click();
    URL.revokeObjectURL(a.href);
    this._dirty = false;
    return { success: true, browser: true };
  }

  async _openBrowser() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.novastar,.json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) { resolve({ success: false, error: 'No file' }); return; }
        try {
          const raw = await file.text();
          const data = JSON.parse(raw);
          this.projectName = data.name || file.name.replace(/\.[^.]+$/, '');
          this._dirty = false;
          resolve({ success: true, data, browser: true });
        } catch (err) {
          resolve({ success: false, error: err.message });
        }
      };
      input.click();
    });
  }

  // ─── Autosave ─────────────────────────────────────────
  _startAutosave() {
    this._stopAutosave();
    // Autosave every 2 minutes if dirty
    this._autosaveInterval = setInterval(() => {
      if (this._dirty && this.projectPath) {
        // Trigger autosave event - the editor should listen for this
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('novastar:autosave'));
        }
      }
    }, 120000);
  }

  _stopAutosave() {
    if (this._autosaveInterval) {
      clearInterval(this._autosaveInterval);
      this._autosaveInterval = null;
    }
  }

  dispose() {
    this._stopAutosave();
  }
}
