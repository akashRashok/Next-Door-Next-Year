import { chromium } from 'playwright-core';
import { mkdir, copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';

const frames = join(process.cwd(), 'frames');
await mkdir(frames, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.locator('.ss-stage').waitFor({ state: 'visible' });
await page.evaluate(() => document.fonts.ready);

const fps = 20;
const framesTotal = 390;
const started = performance.now();
let previous = '';
let captured = 0;
for (let i = 0; i < framesTotal; i++) {
  const target = started + i * 1000 / fps;
  const remaining = target - performance.now();
  if (remaining > 1) await new Promise(resolve => setTimeout(resolve, remaining));
  const filename = join(frames, `${String(i).padStart(5, '0')}.jpg`);
  if (performance.now() - target > 65 && previous) {
    await copyFile(previous, filename);
  } else {
    await page.screenshot({ path: filename, type: 'jpeg', quality: 91 });
    captured++;
  }
  previous = filename;
}
console.log(JSON.stringify({ frames: framesTotal, captured, elapsedSeconds: ((performance.now() - started) / 1000).toFixed(2) }));
await browser.close();
