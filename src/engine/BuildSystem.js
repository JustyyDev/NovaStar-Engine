/**
 * NovaStar Build System
 * Packages games for web, desktop (Windows/Mac/Linux), and mobile
 * 
 * Usage from editor or CLI:
 *   BuildSystem.build('web')       → dist/web/
 *   BuildSystem.build('windows')   → dist/NovaStar-Game-Setup.exe
 *   BuildSystem.build('macos')     → dist/NovaStar-Game.dmg
 *   BuildSystem.build('linux')     → dist/NovaStar-Game.AppImage
 *   BuildSystem.build('android')   → dist/NovaStar-Game.apk (via Capacitor)
 *   BuildSystem.build('ios')       → dist/NovaStar-Game.ipa (via Capacitor)
 */

export class BuildSystem {
  constructor(engine) {
    this.engine = engine;
    this.config = {
      gameName: 'NovaStar Game',
      version: '1.0.0',
      author: '',
      description: '',
      icon: null,
      windowWidth: 1280,
      windowHeight: 720,
      resizable: true,
      fullscreen: false,
      backgroundColor: '#000000',
    };

    // Platform-specific configs
    this.platforms = {
      web: {
        enabled: true,
        outputDir: 'dist/web',
        minify: true,
        compressionLevel: 9,
      },
      windows: {
        enabled: true,
        outputDir: 'dist/windows',
        arch: 'x64',
        createInstaller: true,
        installerType: 'nsis', // 'nsis', 'msi', 'portable'
      },
      macos: {
        enabled: true,
        outputDir: 'dist/macos',
        arch: ['x64', 'arm64'],
        createDMG: true,
        category: 'public.app-category.games',
      },
      linux: {
        enabled: true,
        outputDir: 'dist/linux',
        arch: 'x64',
        formats: ['AppImage', 'deb'],
      },
      android: {
        enabled: false,
        outputDir: 'dist/android',
        packageName: 'com.novastar.game',
        minSDK: 24,
        targetSDK: 34,
      },
      ios: {
        enabled: false,
        outputDir: 'dist/ios',
        bundleId: 'com.novastar.game',
        minVersion: '14.0',
      },
      // Console support (requires devkit)
      nintendo_switch: {
        enabled: false,
        note: 'Requires Nintendo Developer Portal access and devkit hardware',
        sdk: 'NintendoSDK',
      },
      playstation: {
        enabled: false,
        note: 'Requires PlayStation Partners registration and devkit',
        sdk: 'PlayStation SDK',
      },
      xbox: {
        enabled: false,
        note: 'Requires ID@Xbox registration',
        sdk: 'GDK (Game Development Kit)',
      },
    };
  }

  /**
   * Set game configuration
   */
  configure(config) {
    Object.assign(this.config, config);
    return this;
  }

  /**
   * Set platform-specific configuration
   */
  configurePlatform(platform, config) {
    if (this.platforms[platform]) {
      Object.assign(this.platforms[platform], config);
    }
    return this;
  }

  /**
   * Get build status for all platforms
   */
  getStatus() {
    const status = {};
    for (const [name, config] of Object.entries(this.platforms)) {
      status[name] = {
        enabled: config.enabled,
        available: this._isPlatformAvailable(name),
        note: config.note || null,
      };
    }
    return status;
  }

  _isPlatformAvailable(platform) {
    switch (platform) {
      case 'web': return true; // Always available
      case 'windows':
      case 'macos':
      case 'linux':
        // Available if Electron is installed
        return typeof window !== 'undefined' && window.novastarDesktop;
      case 'android':
      case 'ios':
        // Would need Capacitor
        return false;
      case 'nintendo_switch':
      case 'playstation':
      case 'xbox':
        return false; // Requires devkits
      default:
        return false;
    }
  }

  /**
   * Build for a specific platform
   * In the browser, this generates the project files
   * From Electron, this can invoke actual build tools
   */
  async build(platform) {
    console.log(`[NovaStar Build] Building for ${platform}...`);

    switch (platform) {
      case 'web':
        return this._buildWeb();
      case 'windows':
      case 'macos':
      case 'linux':
        return this._buildDesktop(platform);
      case 'android':
        return this._buildAndroid();
      case 'ios':
        return this._buildIOS();
      default:
        console.warn(`[NovaStar Build] Platform "${platform}" is not yet supported`);
        return { success: false, error: `Platform "${platform}" not supported` };
    }
  }

  /**
   * Generate a standalone HTML file for web deployment
   */
  _buildWeb() {
    // Collect all scene data
    const sceneData = this._collectSceneData();

    // Generate the standalone HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>${this.config.gameName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { overflow: hidden; background: ${this.config.backgroundColor}; }
    canvas { display: block; width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <canvas id="game-canvas"></canvas>
  <script type="module">
    // NovaStar Engine Runtime (bundled)
    // This would be the Vite-bundled output
    import { NovaStarEngine } from './engine.bundle.js';
    const engine = new NovaStarEngine(document.getElementById('game-canvas'));
    engine.start();
    // Scene data
    const scenes = ${JSON.stringify(sceneData)};
    // Load first scene...
  </script>
</body>
</html>`;

    return {
      success: true,
      platform: 'web',
      output: html,
      instructions: 'Run `npm run build` to generate production files in dist/'
    };
  }

  _buildDesktop(platform) {
    const platformMap = {
      windows: 'npm run electron:build:win',
      macos: 'npm run electron:build:mac',
      linux: 'npm run electron:build:linux',
    };

    return {
      success: true,
      platform,
      instructions: `Run \`${platformMap[platform]}\` from the project root`,
      command: platformMap[platform],
    };
  }

  _buildAndroid() {
    return {
      success: false,
      platform: 'android',
      instructions: [
        '1. Install Capacitor: npm install @capacitor/core @capacitor/cli',
        '2. Initialize: npx cap init',
        '3. Add Android: npx cap add android',
        '4. Build web: npm run build',
        '5. Sync: npx cap sync',
        '6. Open in Android Studio: npx cap open android',
        '7. Build APK from Android Studio',
      ].join('\n'),
    };
  }

  _buildIOS() {
    return {
      success: false,
      platform: 'ios',
      instructions: [
        '1. Requires macOS with Xcode installed',
        '2. Install Capacitor: npm install @capacitor/core @capacitor/cli',
        '3. Initialize: npx cap init',
        '4. Add iOS: npx cap add ios',
        '5. Build web: npm run build',
        '6. Sync: npx cap sync',
        '7. Open in Xcode: npx cap open ios',
        '8. Build IPA from Xcode',
      ].join('\n'),
    };
  }

  _collectSceneData() {
    // Serialize the current scene hierarchy
    const data = {
      config: this.config,
      scenes: {},
    };

    // Would iterate registered scenes and serialize their entities
    return data;
  }

  /**
   * Generate an electron-builder config for a game project
   */
  generateElectronConfig() {
    return {
      appId: `com.novastar.${this.config.gameName.toLowerCase().replace(/\s+/g, '')}`,
      productName: this.config.gameName,
      copyright: `Copyright © ${new Date().getFullYear()} ${this.config.author}`,
      directories: { output: 'release', buildResources: 'electron/assets' },
      files: ['dist/**/*', 'electron/**/*'],
      win: {
        target: [{ target: 'nsis', arch: ['x64'] }],
        icon: 'electron/assets/icon.ico',
      },
      nsis: {
        oneClick: false,
        perMachine: true,
        allowToChangeInstallationDirectory: true,
        createDesktopShortcut: true,
        createStartMenuShortcut: true,
        shortcutName: this.config.gameName,
      },
      mac: {
        target: [{ target: 'dmg', arch: ['x64', 'arm64'] }],
        category: 'public.app-category.games',
      },
      linux: {
        target: [{ target: 'AppImage', arch: ['x64'] }],
        category: 'Game',
      },
    };
  }
}
