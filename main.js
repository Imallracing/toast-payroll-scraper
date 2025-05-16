import { Actor } from 'apify';
import { chromium } from 'playwright';

await Actor.init();

const browser = await chromium.launch({
    headless: true,
});
const page = await browser.newPage();

// Step 1: Set cookies (if using session reuse)
const session = await Actor.getValue('SESSION'); // store your valid cookies under 'SESSION'
if (session && session.cookies) {
    await page.context().addCookies(session.cookies);
}

// Step 2: Navigate directly to Payroll Summary
await page.goto('https://payroll.toasttab.com/mvc/intajuicegreeley/PayrollSummary', {
    waitUntil: 'networkidle',
    timeout: 60000,
});

// Step 3: Confirm page loaded
await page.waitForSelector('h1, .payroll-summary-header, .payroll-summary-table', { timeout: 30000 });

// Step 4: Scrape data
const summaryData = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table tbody tr'));
    return rows.map(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        return cells.map(cell => cell.innerText.trim());
    });
});

// Step 5: Store result
await Actor.setValue('PAYROLL_SUMMARY', summaryData);

await browser.close();
await Actor.exit();
