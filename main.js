const Apify = require('apify');
const { chromium } = require('playwright');

Apify.main(async () => {
    const input = await Apify.getInput();
    const cookies = input.cookies;

    if (!cookies || !Array.isArray(cookies) || cookies.length === 0) {
        throw new Error('❌ No cookies provided in INPUT. Please pass valid session cookies.');
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();

    // Apply cookies
    await context.addCookies(cookies);

    const page = await context.newPage();

    try {
        console.log('🔐 Navigating to Toast Payroll dashboard...');
        await page.goto('https://payroll.toasttab.com/dashboard', {
            waitUntil: 'load',
            timeout: 60000
        });

        console.log('📸 Taking screenshot for verification...');
        await page.screenshot({ path: 'dashboard.png' });

        console.log('✅ Logged in successfully with cookies!');
        await browser.close();
    } catch (err) {
        console.error('❌ Login/navigation failed:', err.message);
        await browser.close();
        throw err;
    }
});
