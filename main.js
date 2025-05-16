const Apify = require('apify');
const { chromium } = require('playwright');

Apify.main(async () => {
  const input = await Apify.getInput();
  const { email, password } = input;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Navigate to Toast Payroll login page
    await page.goto('https://payroll.toasttab.com', { waitUntil: 'domcontentloaded' });

    // Step 2: Wait for the email input
    const emailSelector = 'input[type="email"], input[name="email"], input[type="text"]';
    await page.waitForSelector(emailSelector, { timeout: 10000 });
    await page.fill(emailSelector, email);

    // Step 3: Click "Next"
    const nextBtn = await page.locator('button:has-text("Next")');
    await nextBtn.click();

    // Step 4: Wait for password input
    const pwSelector = 'input[type="password"]';
    await page.waitForSelector(pwSelector, { timeout: 10000 });
    await page.fill(pwSelector, password);

    // Step 5: Submit login
    const signInBtn = await page.locator('button:has-text("Sign in")');
    await signInBtn.click();

    // Step 6: Wait for dashboard or known redirect
    await page.waitForURL(/dashboard|home/i, { timeout: 15000 });

    console.log('✅ Login successful!');
    await Apify.pushData({ status: 'success', step: 'login-passed' });

  } catch (err) {
    console.error('❌ Login failed:', err.message);
    await page.screenshot({ path: 'login-error.png', fullPage: true });
    const html = await page.content();
    await Apify.setValue('DEBUG_HTML', html, { contentType: 'text/html' });
    throw err;
  } finally {
    await browser.close();
  }
});
