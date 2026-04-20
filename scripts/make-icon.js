import sharp from 'sharp';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const BG = { r: 28, g: 42, b: 58, alpha: 1 };
const SIZE = 1024;

const sourcePath = existsSync(resolve(root, 'logo-source.png'))
  ? resolve(root, 'logo-source.png')
  : resolve(root, 'public/doorman-logo.png');
const source = readFileSync(sourcePath);
const meta = await sharp(source).metadata();
console.log(`Source: ${sourcePath} (${meta.width}x${meta.height})`);

const { data, info } = await sharp(source)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

let minX = info.width, minY = info.height, maxX = 0, maxY = 0;
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * info.channels;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const isBg = Math.abs(r - BG.r) < 20 && Math.abs(g - BG.g) < 20 && Math.abs(b - BG.b) < 20;
    if (!isBg) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
}
const doorW = maxX - minX + 1;
const doorH = maxY - minY + 1;
console.log(`Detected door bounds: ${minX},${minY} → ${maxX},${maxY} (${doorW}x${doorH})`);

const padding = 0.08;
const targetInner = Math.round(SIZE * (1 - padding * 2));
const scale = Math.min(targetInner / doorW, targetInner / doorH);
const finalW = Math.round(doorW * scale);
const finalH = Math.round(doorH * scale);

const cropped = await sharp(source)
  .extract({ left: minX, top: minY, width: doorW, height: doorH })
  .resize(finalW, finalH, { fit: 'inside' })
  .png()
  .toBuffer();

await sharp({
  create: { width: SIZE, height: SIZE, channels: 4, background: BG },
})
  .composite([{ input: cropped, gravity: 'center' }])
  .png()
  .toFile(resolve(root, 'public/doorman-logo.png'));

console.log(`Generated ${SIZE}x${SIZE} square icon (door ${finalW}x${finalH} centred, bg #1c2a3a)`);
