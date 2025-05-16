const Apify = require('apify');
const { chromium } = require('playwright');

Apify.main(async () => {
  const input = await Apify.getInput();
  const { email, password } = input;

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  try {
    // STEP 1: Open login screen
    await page.goto('https://payroll.toasttab.com', { waitUntil: 'domcontentloaded', timeout: 60000 });

    // STEP 2: Enter email
    await page.waitForSelector('#username', { timeout: 30000 });
    await page.fill('#username', email);
    await page.click('button[type="submit"]');

    // STEP 3: Wait for auth page to redirect
    await page.waitForURL(/auth\.toasttab\.com/, { timeout: 60000 });
    await page.waitForSelector('input[type="password"]', { timeout: 30000 });

    // STEP 4: Fill password
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // STEP 5: Wait for redirect to dashboard (or prompt)
    await page.waitForLoadState('networkidle', { timeout: 60000 });

    // Optional: Skip 2FA reminder if needed
    try {
      const remindBtn = page.locator('text=Remind Me Later');
      if (await remindBtn.isVisible({ timeout: 3000 })) {
        await remindBtn.click();
      }
    } catch (_) {}

    await page.waitForURL(/dashboard/i, { timeout: 60000 });

    // Screenshot proof of login
    await page.screenshot({ path: 'success-dashboard.png', fullPage: true });

    await Apify.pushData({ success: true, message: 'Login successful.' });

  } catch (err) {
    await page.screenshot({ path: 'login-error.png', fullPage: true });
    console.error('❌ Scraper failed:', err.message);
    throw err;
  } finally {
    await browser.close();
  }
});

