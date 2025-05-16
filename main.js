const Apify = require('apify');
const { chromium } = require('playwright'); // Headless browser

Apify.main(async () => {
    const input = await Apify.getInput();
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();

    // Try loading cookies from previous session
    const cookies = await Apify.getValue('SESSION_COOKIES');
    if (cookies) {
        await context.addCookies(cookies);
        console.log('✅ Reused session cookies');
    }

    const page = await context.newPage();

    // Go to Toast dashboard (should redirect if session works)
    await page.goto('https://payroll.toasttab.com/', {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
    });

    // Check if still logged in or not
    if (await page.$('input[name="Email"], input[type="email"]')) {
        throw new Error('❌ Session expired or not logged in. Re-login required.');
    }

    // Navigate directly to Payroll Summary page
    await page.goto('https://payroll.toasttab.com/mvc/intajuicegreeley/PayrollSummary', {
        waitUntil: 'networkidle',
        timeout: 60000,
    });

    await page.waitForSelector('table', { timeout: 30000 });

    const payrollData = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('table tbody tr'));
        return rows.map(row => {
            return Array.from(row.querySelectorAll('td')).map(cell => cell.innerText.trim());
        });
    });

    // Save scraped data
    await Apify.setValue('PAYROLL_SUMMARY', payrollData);
    console.log(`✅ Payroll summary scraped. Rows: ${payrollData.length}`);

    // Save cookies for next login
    const newCookies = await context.cookies();
    await Apify.setValue('SESSION_COOKIES', newCookies);

    await browser.close();
});
