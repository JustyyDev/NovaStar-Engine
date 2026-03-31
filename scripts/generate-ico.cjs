/**
 * NovaStar Icon Generator
 * Generates a proper .ico file with no dependencies
 * Run: node scripts/generate-ico.cjs
 */

const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'electron', 'assets');

// Generate a 256x256 RGBA pixel buffer for the NovaStar icon
function generateIconPixels(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const cx = size / 2, cy = size / 2, r = size * 0.42;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Rounded square mask
      const cornerR = size * 0.2;
      const inset = size * 0.05;
      const rx = Math.abs(dx) - (cx - inset - cornerR);
      const ry = Math.abs(dy) - (cy - inset - cornerR);
      const cornerDist = rx > 0 && ry > 0 ? Math.sqrt(rx * rx + ry * ry) - cornerR : Math.max(rx, ry) - cornerR;
      const alpha = cornerDist < -1 ? 255 : cornerDist > 1 ? 0 : Math.round(255 * (1 - (cornerDist + 1) / 2));

      if (alpha === 0) {
        pixels[idx] = pixels[idx+1] = pixels[idx+2] = pixels[idx+3] = 0;
        continue;
      }

      // Background gradient (deep blue-purple to dark green)
      const gradT = (x + y) / (size * 2);
      const bgR = Math.round(26 * (1 - gradT) + 10 * gradT);
      const bgG = Math.round(10 * (1 - gradT) + 42 * gradT);
      const bgB = Math.round(46 * (1 - gradT) + 30 * gradT);

      // Star shape
      const starDist = dist / r;
      const angle = Math.atan2(dy, dx);
      const points = 5;
      const starAngle = ((angle + Math.PI) / (2 * Math.PI)) * points * 2;
      const starIdx = Math.floor(starAngle);
      const starFrac = starAngle - starIdx;
      const innerR = 0.38;
      const outerR = 0.85;
      const targetR = starIdx % 2 === 0
        ? outerR + (innerR - outerR) * starFrac
        : innerR + (outerR - innerR) * starFrac;

      let finalR = bgR, finalG = bgG, finalB = bgB;

      if (starDist < targetR * 1.15 && starDist < 0.95) {
        // Star gradient: green -> cyan -> pink
        const starT = (angle + Math.PI) / (2 * Math.PI);
        let sR, sG, sB;
        if (starT < 0.33) {
          const t = starT / 0.33;
          sR = Math.round(95 * (1-t) + 77 * t);
          sG = Math.round(245 * (1-t) + 200 * t);
          sB = Math.round(154 * (1-t) + 255 * t);
        } else if (starT < 0.66) {
          const t = (starT - 0.33) / 0.33;
          sR = Math.round(77 * (1-t) + 255 * t);
          sG = Math.round(200 * (1-t) + 107 * t);
          sB = Math.round(255 * (1-t) + 218 * t);
        } else {
          const t = (starT - 0.66) / 0.34;
          sR = Math.round(255 * (1-t) + 95 * t);
          sG = Math.round(107 * (1-t) + 245 * t);
          sB = Math.round(218 * (1-t) + 154 * t);
        }

        if (starDist < targetR) {
          // Inner star - bright
          const brightness = 1 - starDist * 0.3;
          finalR = Math.min(255, Math.round(sR * brightness));
          finalG = Math.min(255, Math.round(sG * brightness));
          finalB = Math.min(255, Math.round(sB * brightness));
        } else {
          // Star glow edge
          const edge = (starDist - targetR) / (targetR * 0.15);
          const glow = Math.max(0, 1 - edge);
          finalR = Math.round(bgR + (sR - bgR) * glow * 0.5);
          finalG = Math.round(bgG + (sG - bgG) * glow * 0.5);
          finalB = Math.round(bgB + (sB - bgB) * glow * 0.5);
        }

        // Inner highlight
        if (starDist < targetR * 0.5) {
          const hl = (1 - starDist / (targetR * 0.5)) * 0.3;
          finalR = Math.min(255, Math.round(finalR + 255 * hl));
          finalG = Math.min(255, Math.round(finalG + 255 * hl));
          finalB = Math.min(255, Math.round(finalB + 255 * hl));
        }
      }

      // Outer glow ring
      const ringR = size * 0.37;
      const ringDist = Math.abs(dist - ringR);
      if (ringDist < 3 && dist > r * 0.8) {
        const ringAlpha = Math.max(0, 1 - ringDist / 3) * 0.2;
        finalR = Math.min(255, Math.round(finalR + 95 * ringAlpha));
        finalG = Math.min(255, Math.round(finalG + 245 * ringAlpha));
        finalB = Math.min(255, Math.round(finalB + 200 * ringAlpha));
      }

      // BGRA format for .ico
      pixels[idx]     = finalB;
      pixels[idx + 1] = finalG;
      pixels[idx + 2] = finalR;
      pixels[idx + 3] = alpha;
    }
  }
  return pixels;
}

// Create a BMP for embedding in ICO
function createBMPData(pixels, size) {
  const bmpInfoHeaderSize = 40;
  const pixelDataSize = size * size * 4;
  const maskSize = Math.ceil(size / 8) * size;

  const header = Buffer.alloc(bmpInfoHeaderSize);
  header.writeUInt32LE(bmpInfoHeaderSize, 0);   // biSize
  header.writeInt32LE(size, 4);                   // biWidth
  header.writeInt32LE(size * 2, 8);               // biHeight (doubled for ICO)
  header.writeUInt16LE(1, 12);                    // biPlanes
  header.writeUInt16LE(32, 14);                   // biBitCount
  header.writeUInt32LE(0, 16);                    // biCompression (BI_RGB)
  header.writeUInt32LE(pixelDataSize + maskSize, 20); // biSizeImage

  // Flip pixels vertically (BMP is bottom-up)
  const flipped = Buffer.alloc(pixelDataSize);
  for (let y = 0; y < size; y++) {
    const srcRow = y * size * 4;
    const dstRow = (size - 1 - y) * size * 4;
    pixels.copy(flipped, dstRow, srcRow, srcRow + size * 4);
  }

  // AND mask (all zeros = fully use alpha channel)
  const mask = Buffer.alloc(maskSize, 0);

  return Buffer.concat([header, flipped, mask]);
}

// Create ICO file with multiple sizes
function createICO(sizes) {
  const images = sizes.map(size => {
    const pixels = generateIconPixels(size);
    return { size, data: createBMPData(pixels, size) };
  });

  // ICO header
  const headerSize = 6 + images.length * 16;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);                     // Reserved
  header.writeUInt16LE(1, 2);                     // Type (1 = ICO)
  header.writeUInt16LE(images.length, 4);         // Count

  let dataOffset = headerSize;
  images.forEach((img, i) => {
    const entryOffset = 6 + i * 16;
    header.writeUInt8(img.size >= 256 ? 0 : img.size, entryOffset);      // Width
    header.writeUInt8(img.size >= 256 ? 0 : img.size, entryOffset + 1);  // Height
    header.writeUInt8(0, entryOffset + 2);          // Color palette
    header.writeUInt8(0, entryOffset + 3);          // Reserved
    header.writeUInt16LE(1, entryOffset + 4);       // Color planes
    header.writeUInt16LE(32, entryOffset + 6);      // Bits per pixel
    header.writeUInt32LE(img.data.length, entryOffset + 8);  // Data size
    header.writeUInt32LE(dataOffset, entryOffset + 12);      // Data offset
    dataOffset += img.data.length;
  });

  return Buffer.concat([header, ...images.map(img => img.data)]);
}

// Also generate a simple PNG for other uses
function createPNG(pixels, size) {
  // Simple uncompressed PNG
  function crc32(buf) {
    let c = 0xFFFFFFFF;
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let cv = n;
      for (let k = 0; k < 8; k++) cv = cv & 1 ? 0xEDB88320 ^ (cv >>> 1) : cv >>> 1;
      table[n] = cv;
    }
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeAndData = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeAndData));
    return Buffer.concat([len, typeAndData, crc]);
  }

  // Convert BGRA to RGBA
  const rgba = Buffer.alloc(pixels.length);
  for (let i = 0; i < pixels.length; i += 4) {
    rgba[i] = pixels[i + 2];     // R
    rgba[i + 1] = pixels[i + 1]; // G
    rgba[i + 2] = pixels[i];     // B
    rgba[i + 3] = pixels[i + 3]; // A
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.writeUInt8(8, 8);   // bit depth
  ihdr.writeUInt8(6, 9);   // RGBA
  ihdr.writeUInt8(0, 10);  // compression
  ihdr.writeUInt8(0, 11);  // filter
  ihdr.writeUInt8(0, 12);  // interlace

  // IDAT - raw (store) blocks
  const rawData = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    rawData[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(rawData, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  // Simple zlib wrapping (store, no compression for reliability)
  const maxBlock = 65535;
  const blocks = [];
  for (let offset = 0; offset < rawData.length; offset += maxBlock) {
    const end = Math.min(offset + maxBlock, rawData.length);
    const isLast = end >= rawData.length;
    const blockData = rawData.slice(offset, end);
    const blockHeader = Buffer.alloc(5);
    blockHeader.writeUInt8(isLast ? 1 : 0, 0);
    blockHeader.writeUInt16LE(blockData.length, 1);
    blockHeader.writeUInt16LE(~blockData.length & 0xFFFF, 3);
    blocks.push(blockHeader, blockData);
  }

  // Adler32
  let a = 1, b = 0;
  for (let i = 0; i < rawData.length; i++) {
    a = (a + rawData[i]) % 65521;
    b = (b + a) % 65521;
  }
  const adler = Buffer.alloc(4);
  adler.writeUInt32BE((b << 16) | a);

  // Zlib header + data + adler
  const zlibData = Buffer.concat([Buffer.from([0x78, 0x01]), ...blocks, adler]);

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlibData), iend]);
}

// ─── GENERATE ────────────────────────────────────
console.log('⭐ Generating NovaStar Engine icons...\n');

// Generate .ico with multiple sizes
const ico = createICO([16, 32, 48, 64, 128, 256]);
fs.writeFileSync(path.join(ASSETS_DIR, 'icon.ico'), ico);
console.log('  ✓ icon.ico (16, 32, 48, 64, 128, 256px)');

// Generate .png (256x256)
const pixels256 = generateIconPixels(256);
const png = createPNG(pixels256, 256);
fs.writeFileSync(path.join(ASSETS_DIR, 'icon.png'), png);
console.log('  ✓ icon.png (256x256)');

console.log('\n✅ Done! Icons saved to electron/assets/');
console.log('   You can now run: npm run electron:build:win');
