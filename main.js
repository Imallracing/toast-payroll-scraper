const Apify = require('apify');

Apify.main(async () => {
    const input = await Apify.getInput();
    const cookies = input.cookies;

    const browser = await Apify.launchPuppeteer({ headless: true });
    const page = await browser.newPage();

    // Set cookies if provided
    if (cookies && Array.isArray(cookies)) {
        await page.setCookie(...cookies);
    }

    // Go to Toast Payroll
    await page.goto('https://payroll.toasttab.com/');

    // Optional: Click Continue if visible
    try {
        await page.waitForSelector('button:has-text("Continue")', { timeout: 5000 });
        await page.click('button:has-text("Continue")');
    } catch (err) {
        console.log('No Continue button, likely already authorized.');
    }

    // Click "View payroll"
    await page.waitForSelector('a:has-text("View payroll")', { timeout: 10000 });
    await page.click('a:has-text("View payroll")');

    // Click "Past Payrolls"
    await page.waitForSelector('button:has-text("Past Payrolls")', { timeout: 10000 });
    await page.click('button:has-text("Past Payrolls")');

    // Click "View" for the most recent payroll
    await page.waitForSelector('a:has-text("View")', { timeout: 10000 });
    const viewLinks = await page.$$('a:has-text("View")');
    if (viewLinks.length > 0) {
        await viewLinks[0].click();
    }

    // Wait for receipt page to load
    await page.waitForSelector('h1', { timeout: 10000 });

    const content = await page.content();
    await Apify.setValue('payrollHtml', content, { contentType: 'text/html' });

    await browser.close();
});
