const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://payroll.toasttab.com');

  // Add login + 2FA bypass + scraping logic here

  await browser.close();
})();
