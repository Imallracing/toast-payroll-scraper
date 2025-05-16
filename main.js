const Apify = require('apify');
const { chromium } = require('playwright');

Apify.main(async () => {
  const input = await Apify.getInput();
  const { email, password } = input;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Go to Toast Payroll login
    await page.goto('https://payroll.toasttab.com', { waitUntil: 'networkidle' });

    // Add delay to give React a moment to hydrate
    await page.waitForTimeout(5000);

    // Wait for React-rendered login form
    await page.waitForSelector('input[data-testid="email"]', { timeout: 30000 });
    await page.waitForSelector('input[type="password"]', { timeout: 30000 });

    // Fill in login form
    await page.fill('input[data-testid="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL(/dashboard|home/i, { timeout: 15000 });

    // Handle 2FA if shown
    const remind = page.locator('text=Remind Me Later');
    if (await remind.isVisible({ timeout: 5000 }).catch(() => false)) {
      await remind.click();
    }

    // ✅ Logged in successfully
    console.log('✅ Login successful!');

    // You can insert scraping logic here...

    // Example: return dummy result
    await Apify.pushData({ success: true, message: 'Logged in and ready to scrape.' });

  } catch (err) {
    console.error('❌ Scraper failed:', err);
    await page.screenshot({ path: 'error-state.png', fullPage: true });
    throw err;
  } finally {
    await browser.close();
  }
});

