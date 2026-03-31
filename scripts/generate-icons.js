/**
 * Icon Generator for NovaStar Engine
 *
 * Run this script to generate all icon formats from the SVG:
 *   node scripts/generate-icons.js
 *
 * Prerequisites:
 *   npm install sharp png-to-ico --save-dev
 *
 * This generates:
 *   electron/assets/icon.png    (256x256 for Electron)
 *   electron/assets/icon.ico    (Windows installer)
 *   electron/assets/icon.icns   (macOS — requires additional tooling on Mac)
 */

import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, '..', 'electron', 'assets');
const svgPath = path.join(assetsDir, 'icon.svg');

async function generateIcons() {
  console.log('⭐ Generating NovaStar icons...');

  const svg = await fs.readFile(svgPath);

  // Generate PNG at multiple sizes
  const sizes = [16, 32, 48, 64, 128, 256, 512];

  for (const size of sizes) {
    const outputPath = path.join(assetsDir, `icon-${size}.png`);
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`  ✓ icon-${size}.png`);
  }

  // Main icon (256x256)
  await sharp(svg)
    .resize(256, 256)
    .png()
    .toFile(path.join(assetsDir, 'icon.png'));
  console.log('  ✓ icon.png (256x256)');

  // For .ico generation, you'd use png-to-ico:
  // const pngToIco = require('png-to-ico');
  // const ico = await pngToIco([path.join(assetsDir, 'icon-256.png')]);
  // await fs.writeFile(path.join(assetsDir, 'icon.ico'), ico);

  console.log('\n✅ Icons generated! To create .ico:');
  console.log('   npm install png-to-ico');
  console.log('   Then uncomment the .ico section in this script.');
  console.log('\n   For .icns (macOS), use iconutil on a Mac.');
}

generateIcons().catch(console.error);
