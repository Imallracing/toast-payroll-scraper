const Apify = require('apify');

Apify.main(async () => {
    const input = await Apify.getInput();
    const cookies = input.cookies;

    const browser = await Apify.launchPuppeteer({ headless: true });
    const page = await browser.newPage();

    if (cookies && Array.isArray(cookies)) {
        await page.setCookie(...cookies);
    }

    console.log('Navigating to Toast Payroll...');
    await page.goto('https://payroll.toasttab.com/', { waitUntil: 'networkidle2' });

    // Click "Continue" if it shows up
    try {
        await page.waitForSelector('button:has-text("Continue")', { timeout: 5000 });
        await page.click('button:has-text("Continue")');
    } catch (e) {
        console.log('No "Continue" button found. Skipping...');
    }

    // Click “View payroll”
    await page.waitForSelector('a:has-text("View payroll")', { timeout: 10000 });
    await page.click('a:has-text("View payroll")');

    // Go to “Past Payrolls”
    await page.waitForSelector('button:has-text("Past Payrolls")', { timeout: 10000 });
    await page.click('button:has-text("Past Payrolls")');

    // Click the most recent “View” button
    await page.waitForSelector('a:has-text("View")', { timeout: 10000 });
    const links = await page.$$('a:has-text("View")');
    if (links.length > 0) {
        await links[0].click();
    }

    await page.waitForSelector('h1', { timeout: 10000 });
    const content = await page.content();
    await Apify.setValue('payrollSummary', content, { contentType: 'text/html' });

    await browser.close();
});
