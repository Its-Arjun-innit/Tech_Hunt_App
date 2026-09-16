const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = '/var/home/darkshadow/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const SCREENS_DIR = path.join(__dirname, 'screens');
const OUTPUT_DIR = path.join(__dirname, 'output');

// Device definitions
const DEVICES = {
  iphone15pro: {
    name: 'iPhone 15 Pro',
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    suffix: 'iphone',
  },
  pixel8: {
    name: 'Android (Pixel 8)',
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2.625,
    suffix: 'android',
  },
};

// Screen files
const SCREENS = [
  { file: '01-login.html', name: '01-login' },
  { file: '02-dashboard.html', name: '02-dashboard' },
  { file: '03-clue.html', name: '03-clue' },
  { file: '04-scanner.html', name: '04-scanner' },
  { file: '05-leaderboard.html', name: '05-leaderboard' },
  { file: '06-team.html', name: '06-team' },
  { file: '07-activity.html', name: '07-activity' },
];

async function captureScreens() {
  // Create output directories
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  for (const device of Object.values(DEVICES)) {
    fs.mkdirSync(path.join(OUTPUT_DIR, device.suffix), { recursive: true });
  }

  console.log('Launching browser...');
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  for (const [deviceKey, device] of Object.entries(DEVICES)) {
    console.log(`\nCapturing for ${device.name} (${device.viewport.width}x${device.viewport.height} @${device.deviceScaleFactor}x)...`);

    const context = await browser.newContext({
      viewport: device.viewport,
      deviceScaleFactor: device.deviceScaleFactor,
      deviceEmulation: {
        viewport: device.viewport,
        deviceScaleFactor: device.deviceScaleFactor,
        isMobile: true,
        hasTouch: true,
      },
    });

    const page = await context.newPage();

    for (const screen of SCREENS) {
      const filePath = path.join(SCREENS_DIR, screen.file);
      const outputPath = path.join(OUTPUT_DIR, device.suffix, `${screen.name}.png`);

      console.log(`  Capturing ${screen.name}...`);
      await page.goto(`file://${filePath}`, { waitUntil: 'networkidle', timeout: 30000 });

      // Wait for fonts to load
      await page.waitForTimeout(2000);

      // Capture the full viewport
      await page.screenshot({
        path: outputPath,
        fullPage: false,
        type: 'png',
      });

      console.log(`  ✓ Saved ${outputPath}`);
    }

    await context.close();
  }

  await browser.close();
  console.log('\nDone! All screens captured.');
}

captureScreens().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
