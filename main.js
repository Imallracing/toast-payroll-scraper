const Apify = require('apify');
const { chromium } = require('playwright');

Apify.main(async () => {
    const input = await Apify.getInput();
    const cookies = input.cookies;

    if (!cookies || !Array.isArray(cookies)) {
        throw new Error('No cookies found in input. Please provide an array of cookies.');
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Set cookies
    await context.addCookies(cookies);

    // Go to dashboard (assumes cookies are valid)
    await page.goto('https://payroll.toasttab.com/intajuicegreeley/dashboard', { waitUntil: 'networkidle' });

    // Click Continue if button is present
    try {
        const continueBtn = await page.waitForSelector('button:has-text("Continue")', { timeout: 5000 });
        await continueBtn.click();
        console.log('Clicked Continue.');
    } catch (e) {
        console.log('No Continue button, already authorized or bypassed.');
    }

    // Wait for dashboard
    await page.waitForSelector('text=Payroll', { timeout: 10000 });
    await page.click('text=Payroll');

    // Click Past Payrolls tab
    await page.waitForSelector('text=Past Payrolls', { timeout: 10000 });
    await page.click('text=Past Payrolls');

    // Click "View" on the first past payroll (adjust selector as needed)
    await page.waitForSelector('text=View', { timeout: 10000 });
    const viewButtons = await page.$$('text=View');
    if (viewButtons.length === 0) throw new Error('No past payroll view buttons found.');
    await viewButtons[0].click();
    console.log('Navigated to past payroll detail.');

    // Wait for receipt content to load
    await page.waitForSelector('text=Payroll Withdrawal Receipt', { timeout: 10000 });
    const content = await page.content();
    console.log('Scraped payroll summary.');

    // Save content
    await Apify.setValue('payroll-summary-html', content);
    await Apify.pushData({ html: content });

    await browser.close();
});
