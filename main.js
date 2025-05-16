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

    // Inject session cookies
    await context.addCookies(cookies);

    const page = await context.newPage();

    try {
        await page.goto('https://payroll.toasttab.com/dashboard', {
            waitUntil: 'load',
            timeout: 60000
        });

        // Screenshot to confirm login
        await page.screenshot({ path: 'dashboard.png' });

        // You could also scrape something here like payroll status
        const content = await page.content();
        console.log('✅ Dashboard loaded. Content length:', content.length);

        await browser.close();
    } catch (err) {
        console.error('❌ Navigation or scraping failed:', err.message);
        await browser.close();
        throw err;
    }
});
