const Apify = require('apify');
const { chromium } = require('playwright');

Apify.main(async () => {
  const input = await Apify.getInput();
  const { email, password } = input;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Go to login
    await page.goto('https://payroll.toasttab.com', { waitUntil: 'networkidle' });

    // Optional: slow things down a bit for React hydration
    await page.waitForTimeout(6000);

    // Step 2: Try multiple selectors for email input
    const emailSelectors = [
      'input[name="Email"]',
      '#Email',
      'input[type="email"]',
      'input[autocomplete="username"]',
      'input[type="text"]'
    ];

    let emailSelectorFound = null;
    for (const selector of emailSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        emailSelectorFound = selector;
        break;
      } catch (_) {}
    }

    if (!emailSelectorFound) {
      await page.screenshot({ path: 'email-selector-failed.png' });
      const html = await page.content();
      throw new Error('❌ Could not find email input. Screenshot and HTML logged.');
    }

    // Step 3: Fill form
    await page.fill(emailSelectorFound, email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // Step 4: Wait for redirect to dashboard
    await page.waitForURL(/dashboard|home/i, { timeout: 15000 });

    // Step 5: Optional 2FA bypass
    const remindLater = page.locator('text=Remind Me Later');
    if (await remindLater.isVisible({ timeout: 5000 }).catch(() => false)) {
      await remindLater.click();
    }

    // ✅ Done
    console.log('✅ Login successful. Ready to scrape.');
    await Apify.pushData({ success: true });

  } catch (err) {
    console.error('❌ Script failed:', err.message);
    await page.screenshot({ path: 'login-error.png', fullPage: true });
    const html = await page.content();
    await Apify.setValue('DEBUG_HTML', html, { contentType: 'text/html' });
    throw err;
  } finally {
    await browser.close();
  }
});
