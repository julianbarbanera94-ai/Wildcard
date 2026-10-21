// Headless smoke test: node tests/e2e-smoke.js  (needs playwright; set PW to its path if not resolvable)
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
  const page = await browser.newPage({ viewport: { width: 960, height: 700 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../index.html'));
  await page.waitForTimeout(500);
  await page.screenshot({ path: process.env.OUT + '/title.png' });
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})();
