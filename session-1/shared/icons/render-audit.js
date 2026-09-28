#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { pathToFileURL } = require('url');

const ICON_DIR = __dirname;
const AUDIT_DIR = path.join(ICON_DIR, 'audit');
const WRAPPER_DIR = path.join(AUDIT_DIR, 'wrappers');
const ICON_OUT_DIR = path.join(AUDIT_DIR, 'icons');
const GRID_PATH = path.join(AUDIT_DIR, 'grid.png');
const GRID_HTML_PATH = path.join(AUDIT_DIR, 'grid.html');
const REPORT_PATH = path.join(AUDIT_DIR, 'report.json');
const CHROME_PATH =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const GREEN = [0x5d, 0xce, 0xa5];
const BLACK = [0x00, 0x00, 0x00];
const WHITE = [0xff, 0xff, 0xff];
const TARGET_GREEN_MIN = 0.25;
const TARGET_GREEN_MAX = 0.35;
const TARGET_GREEN_CENTER = 0.30;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function iconFiles() {
  return fs
    .readdirSync(ICON_DIR)
    .filter((name) => name.endsWith('.svg'))
    .sort();
}

function readIconSvg(iconName) {
  return fs.readFileSync(path.join(ICON_DIR, iconName), 'utf8').trim();
}

function wrapperHtml(iconName) {
  const svg = readIconSvg(iconName);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      background: white;
      overflow: hidden;
    }
    body {
      display: grid;
      place-items: center;
    }
    .frame {
      width: 220px;
      height: 220px;
      display: grid;
      place-items: center;
      background: white;
    }
    svg {
      width: 160px;
      height: 160px;
      display: block;
    }
  </style>
</head>
<body>
  <div class="frame">
    ${svg}
  </div>
</body>
</html>`;
}

function gridHtml(icons) {
  const cards = icons
    .map((icon) => {
      const svg = readIconSvg(icon);
      return `<div class="card"><div class="frame">${svg}</div><div class="name">${icon}</div></div>`;
    })
    .join('\n    ');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ByteByteGo Icon Review</title>
  <style>
    :root {
      color-scheme: light;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #ffffff;
      color: #111111;
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 32px;
      background: #ffffff;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 28px;
      line-height: 1.1;
    }
    p {
      margin: 0 0 28px;
      color: #555555;
      font-size: 15px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 18px;
    }
    .card {
      border: 1px solid #e8e8e8;
      border-radius: 18px;
      padding: 18px;
      background: #ffffff;
    }
    .frame {
      display: grid;
      place-items: center;
      min-height: 140px;
      border-radius: 14px;
      background:
        linear-gradient(#fafafa, #fafafa),
        linear-gradient(90deg, #f1f1f1 1px, transparent 1px),
        linear-gradient(#f1f1f1 1px, transparent 1px);
      background-size: auto, 20px 20px, 20px 20px;
    }
    .frame svg {
      width: 84px;
      height: 84px;
      display: block;
    }
    .name {
      margin-top: 14px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
  </style>
</head>
<body>
  <h1>ByteByteGo Icon Review</h1>
  <p>Transparent SVGs on white with a subtle grid to check stroke weight, negative space, and accent balance.</p>
  <div class="grid">
    ${cards}
  </div>
</body>
</html>`;
}

function renderScreenshot(inputUrl, outputPath, width, height) {
  execFileSync(
    CHROME_PATH,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--allow-file-access-from-files',
      `--window-size=${width},${height}`,
      `--screenshot=${outputPath}`,
      inputUrl,
    ],
    { stdio: 'pipe' }
  );
}

function distanceSq(a, b) {
  return (
    (a[0] - b[0]) * (a[0] - b[0]) +
    (a[1] - b[1]) * (a[1] - b[1]) +
    (a[2] - b[2]) * (a[2] - b[2])
  );
}

function analyzePixels(imagePath) {
  const txt = execFileSync(
    'magick',
    [imagePath, '-alpha', 'remove', '-alpha', 'off', 'txt:-'],
    { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }
  );

  let greenPixels = 0;
  let blackPixels = 0;

  for (const line of txt.split('\n')) {
    const match = line.match(/^\s*\d+,\d+:\s+\((\d+),(\d+),(\d+)\)/);
    if (!match) continue;

    const rgb = [Number(match[1]), Number(match[2]), Number(match[3])];
    const avg = (rgb[0] + rgb[1] + rgb[2]) / 3;
    const spread = Math.max(...rgb) - Math.min(...rgb);

    if (distanceSq(rgb, WHITE) < 18 * 18 * 3) {
      continue;
    }

    if (spread < 16) {
      if (avg < 238) blackPixels += 1;
      continue;
    }

    const greenDominant = rgb[1] > rgb[0] + 8 && rgb[1] > rgb[2] + 4 && rgb[1] > 80;
    const greenDistance = distanceSq(rgb, GREEN);
    const blackDistance = distanceSq(rgb, BLACK);

    if (greenDominant || greenDistance < blackDistance * 0.6) {
      greenPixels += 1;
    } else {
      blackPixels += 1;
    }
  }

  return { greenPixels, blackPixels };
}

function scoreRatio(greenRatio) {
  const distance = Math.abs(greenRatio - TARGET_GREEN_CENTER);
  const normalized = Math.max(0, 1 - distance / 0.20);
  return Math.round(normalized * 100);
}

function greenStatus(greenRatio) {
  if (greenRatio < TARGET_GREEN_MIN) return 'too_low';
  if (greenRatio > TARGET_GREEN_MAX) return 'too_high';
  return 'target';
}

function main() {
  if (!fs.existsSync(CHROME_PATH)) {
    throw new Error(`Chrome not found at ${CHROME_PATH}`);
  }

  ensureDir(AUDIT_DIR);
  ensureDir(WRAPPER_DIR);
  ensureDir(ICON_OUT_DIR);

  const icons = iconFiles();
  const report = [];

  fs.writeFileSync(GRID_HTML_PATH, gridHtml(icons));
  renderScreenshot(pathToFileURL(GRID_HTML_PATH).href, GRID_PATH, 1600, 1200);

  for (const icon of icons) {
    const wrapperPath = path.join(WRAPPER_DIR, `${icon}.html`);
    fs.writeFileSync(wrapperPath, wrapperHtml(icon));

    const screenshotPath = path.join(ICON_OUT_DIR, icon.replace(/\.svg$/, '.png'));
    renderScreenshot(pathToFileURL(wrapperPath).href, screenshotPath, 256, 256);

    const { greenPixels, blackPixels } = analyzePixels(screenshotPath);
    const visiblePixels = greenPixels + blackPixels;
    const greenRatio = visiblePixels > 0 ? greenPixels / visiblePixels : 0;

    report.push({
      icon,
      screenshot: screenshotPath,
      greenPixels,
      blackPixels,
      visiblePixels,
      greenRatio: Number(greenRatio.toFixed(4)),
      greenRatioPercent: Number((greenRatio * 100).toFixed(1)),
      ratioScore: scoreRatio(greenRatio),
      ratioStatus: greenStatus(greenRatio),
    });
  }

  fs.writeFileSync(
    REPORT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        chromePath: CHROME_PATH,
        targetGreenRatio: {
          min: TARGET_GREEN_MIN,
          max: TARGET_GREEN_MAX,
          center: TARGET_GREEN_CENTER,
        },
        grid: GRID_PATH,
        icons: report,
      },
      null,
      2
    )
  );

  console.log(
    JSON.stringify(
      {
        grid: GRID_PATH,
        report: REPORT_PATH,
        icons: report.map((entry) => ({
          icon: entry.icon,
          greenRatioPercent: entry.greenRatioPercent,
          ratioScore: entry.ratioScore,
          ratioStatus: entry.ratioStatus,
        })),
      },
      null,
      2
    )
  );
}

main();
