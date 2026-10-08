// Generates the app icons (PNG) from public/logo.svg (the Nihonguito onigiri).
// Renders the SVG once at 1024 px with headless Microsoft Edge / Chrome, then downscales.
// Usage: node tools/make-icons.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { decodePng, encodePng, resize } from './png.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const svg = path.join(publicDir, 'logo.svg');
const cache = path.join(root, 'tools', '.cache');
fs.mkdirSync(cache, { recursive: true });

const browsers = [
  process.env.BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const browser = browsers.find((b) => fs.existsSync(b));
if (!browser) {
  console.error('No se encontró Edge ni Chrome. Define BROWSER=/ruta/al/navegador');
  process.exit(1);
}

const big = path.join(cache, 'logo-1024.png');
fs.rmSync(big, { force: true });
execFileSync(browser, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--default-background-color=00000000',
  `--user-data-dir=${path.join(cache, 'browser-profile')}`,
  '--window-size=1024,1024',
  `--screenshot=${big}`,
  pathToFileURL(svg).href,
], { stdio: 'ignore', timeout: 60000 });
if (!fs.existsSync(big)) throw new Error('No se pudo renderizar el logo');

const src = decodePng(fs.readFileSync(big));
const out = (name, size) => fs.writeFileSync(path.join(publicDir, 'icons', name), encodePng(resize(src, size, size)));
fs.mkdirSync(path.join(publicDir, 'icons'), { recursive: true });
for (const s of [72, 96, 128, 144, 152, 192, 384, 512]) out(`icon-${s}x${s}.png`, s);
out('favicon-32.png', 32);
out('apple-touch-icon.png', 180);
console.log('icons written from logo.svg');
