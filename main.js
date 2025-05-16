const Apify = require('apify');
const { chromium } = require('playwright');

Apify.main(async () => {
  const input = await Apify.getInput();
  const { email, password } = input;

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  try {
    await page.goto('https://payroll.toasttab.com', { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Step 1: Fill email and click "Next"
    await page.waitForSelector('input[type="email"], input[data-testid="email"]', { timeout: 30000 });
    await page.fill('input[type="email"], input[data-testid="email"]', email);
    await page.click('button[type="submit"], button:has-text("Next")');

    // Step 2: Wait for password input
    await page.waitForURL(/auth\.toasttab\.com/, { timeout: 60000 });
    await page.waitForSelector('input[type="password"]', { timeout: 30000 });
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"], button:has-text("Log In")');

    // Step 3: Cloudflare bot protection
    await page.waitForLoadState('networkidle', { timeout: 60000 });

    // Optional 2FA skip
    try {
      const remindMeLater = page.locator('text=Remind Me Later');
      if (await remindMeLater.isVisible({ timeout: 5000 })) {
        await remindMeLater.click();
      }
    } catch (_) {}

    // Step 4: Wait for dashboard
    await page.waitForURL(/dashboard/i, { timeout: 60000 });

    // Screenshot confirmation
    await page.screenshot({ path: 'dashboard-confirmation.png', fullPage: true });

    // 🧠 Insert scraping logic here OR mark success
    await Apify.pushData({ success: true, message: 'Logged in successfully!' });

  } catch (error) {
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
    console.error('❌ Login failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
});
