const Apify = require('apify');
const { chromium } = require('playwright');

Apify.main(async () => {
    const input = await Apify.getInput();
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();

    // Load session cookies if available
    const cookies = await Apify.getValue('SESSION_COOKIES');
    if (cookies) {
        await context.addCookies(cookies);
        console.log('✅ Reused session cookies');
    }

    const page = await context.newPage();

    // Go to base Toast dashboard
    await page.goto('https://payroll.toasttab.com/', {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
    });

    // Ensure still logged in
    if (await page.$('input[name="Email"], input[type="email"]')) {
        throw new Error('❌ Session expired. Re-login required.');
    }

    // Go to Payroll Summary
    const payrollUrl = 'https://payroll.toasttab.com/mvc/intajuicegreeley/PayrollSummary';
    console.log(`📍 Navigating to: ${payrollUrl}`);
    await page.goto(payrollUrl, {
        waitUntil: 'networkidle',
        timeout: 60000,
    });

    // Wait for payroll table or throw detailed error
    try {
        await page.waitForSelector('table tbody tr', { timeout: 30000 });
    } catch (err) {
        const content = await page.content();
        throw new Error(`❌ Table not found. Current URL: ${page.url()}\nPage Content Snippet:\n${content.slice(0, 1000)}`);
    }

    const data = await page.$$eval('table tbody tr', rows => {
        return rows.map(row => {
            const cols = Array.from(row.querySelectorAll('td'));
            return cols.map(td => td.innerText.trim());
        });
    });

    await Apify.setValue('PAYROLL_SUMMARY', data);
    console.log(`✅ Extracted ${data.length} rows from summary`);

    const newCookies = await context.cookies();
    await Apify.setValue('SESSION_COOKIES', newCookies);

    await browser.close();
});
