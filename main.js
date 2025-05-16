const Apify = require('apify');
const { chromium } = require('playwright');

Apify.main(async () => {
    const input = await Apify.getInput();
    const { email, password } = input;

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        // Step 1: Go to login page
        await page.goto('https://payroll.toasttab.com', { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Step 2: Wait for email field
        await page.waitForSelector('#username', { timeout: 30000 });
        await page.fill('#username', email);
        await page.click('button[type="submit"]');

        // Step 3: Wait for Cloudflare / 2FA redirect
        await page.waitForLoadState('networkidle', { timeout: 60000 });

        if (!page.url().includes('auth.toasttab.com')) {
            throw new Error('Stuck on CAPTCHA or not redirected to auth.toasttab.com');
        }

        // Step 4: Wait for password field and log in
        await page.waitForSelector('input[type="password"]', { timeout: 30000 });
        await page.fill('input[type="password"]', password);
        await page.click('button[type="submit"]');

        // Step 5: Wait for successful login (dashboard or redirect)
        await page.waitForURL(/dashboard|payroll/, { timeout: 60000 });

        // Screenshot to confirm success
        await page.screenshot({ path: 'success.png', fullPage: true });

        console.log('✅ Login successful');
    } catch (error) {
        console.error('❌ Login failed:', error);
        await page.screenshot({ path: 'login-error.png', fullPage: true });
        throw error;
    } finally {
        await browser.close();
    }
});
