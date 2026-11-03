import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outDir = path.resolve(__dirname, '../docs/screenshots');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'https://sabrstudio.in';

const targets = [
  {
    name: 'homepage-desktop.png',
    path: '/',
    viewport: { width: 1440, height: 900 },
    delay: 3000,
    fullPage: false
  },
  {
    name: 'homepage-mobile.png',
    path: '/',
    viewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
    delay: 3000,
    fullPage: false
  },
  {
    name: 'projects-desktop.png',
    path: '/projects',
    viewport: { width: 1440, height: 950 },
    delay: 3000,
    fullPage: false
  },
  {
    name: 'projects-mobile.png',
    path: '/projects',
    viewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
    delay: 3000,
    fullPage: false
  },
  {
    name: 'project-details-desktop.png',
    path: '/projects/the-vasant-vihar-residence',
    fallbackPath: '/projects',
    viewport: { width: 1440, height: 950 },
    delay: 3000,
    fullPage: false
  },
  {
    name: 'retail-desktop.png',
    path: '/retail',
    viewport: { width: 1440, height: 950 },
    delay: 3000,
    fullPage: false
  },
  {
    name: 'retail-mobile.png',
    path: '/retail',
    viewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
    delay: 3000,
    fullPage: false
  },
  {
    name: 'product-details-desktop.png',
    path: '/retail/komorebi-lounge-chair',
    viewport: { width: 1440, height: 950 },
    delay: 3000,
    fullPage: false
  },
  {
    name: 'services-desktop.png',
    path: '/services',
    viewport: { width: 1440, height: 950 },
    delay: 3000,
    fullPage: false
  },
  {
    name: 'about-desktop.png',
    path: '/about',
    viewport: { width: 1440, height: 950 },
    delay: 3000,
    fullPage: false
  },
  {
    name: 'contact-desktop.png',
    path: '/contact',
    viewport: { width: 1440, height: 950 },
    delay: 3000,
    fullPage: false
  },
  {
    name: 'cart-desktop.png',
    path: '/cart',
    viewport: { width: 1440, height: 900 },
    delay: 3000,
    fullPage: false
  },
  {
    name: 'checkout-desktop.png',
    path: '/checkout',
    viewport: { width: 1440, height: 900 },
    delay: 3000,
    fullPage: false
  },
  {
    name: 'login-desktop.png',
    path: '/login',
    viewport: { width: 1440, height: 900 },
    delay: 3000,
    fullPage: false
  }
];

async function run() {
  console.log(`[Screenshot Engine] Launching Chrome at ${CHROME_PATH}...`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--hide-scrollbars'
    ]
  });

  const page = await browser.newPage();

  for (const target of targets) {
    const targetUrl = `${BASE_URL}${target.path}`;
    const dest = path.join(outDir, target.name);
    console.log(`[Capture] Navigating to ${targetUrl} (${target.viewport.width}x${target.viewport.height})...`);
    
    try {
      await page.setViewport(target.viewport);
      await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 35000 });
      
      // Wait for fonts & animations
      await page.evaluate(() => document.fonts.ready);
      await new Promise((r) => setTimeout(r, target.delay || 2500));
      
      await page.screenshot({
        path: dest,
        fullPage: target.fullPage
      });

      const stats = fs.statSync(dest);
      console.log(`  ✓ Saved ${target.name} (${Math.round(stats.size / 1024)} KB)`);
    } catch (err) {
      console.error(`  ✗ Failed to capture ${target.name}:`, err.message);
    }
  }

  await browser.close();
  console.log('[Screenshot Engine] Finished all targets.');
}

run().catch((err) => {
  console.error('[Screenshot Engine] Fatal error:', err);
  process.exit(1);
});
