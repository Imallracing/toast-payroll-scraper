const Apify = require('apify');
const { chromium } = require('playwright');

Apify.main(async () => {
    const input = await Apify.getInput();
    const { email, password } = input;

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        // Step 1: Navigate to Toast Payroll login
        console.log('Navigating to https://payroll.toasttab.com');
        await page.goto('https://payroll.toasttab.com', { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Step 2: Wait for and fill email field
        console.log('Waiting for email input...');
        await page.waitForSelector('#username', { timeout: 30000 });
        await page.fill('#username', email);
        await page.click('button[type="submit"]');

        // Step 3: Cloudflare or CAPTCHA pause (allow network idle)
        await page.waitForLoadState('networkidle', { timeout: 60000 });

        // Step 4: Wait for password field
        console.log('Waiting for password input...');
        await page.waitForSelector('input[type="password"]', { timeout: 30000 });
        await page.fill('input[type="password"]', password);
        await page.click('button[type="submit"]');

        // Step 5: Wait for dashboard URL or authenticated redirect
        await page.waitForURL(url => /dashboard|payroll/.test(url), { timeout: 60000 });

        // Screenshot success
        await page.screenshot({ path: 'login-success.png', fullPage: true });
        console.log('✅ Successfully logged in!');

    } catch (err) {
        console.error('❌ Login failed:', err.message);
        await page.screenshot({ path: 'login-failed.png', fullPage: true });
        throw err;
    } finally {
        await browser.close();
    }
});
