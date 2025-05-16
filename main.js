const Apify = require('apify');

Apify.main(async () => {
    const input = await Apify.getInput();
    const cookies = input.cookies; // expect cookies as an array of objects

    const browser = await Apify.launchPuppeteer({ headless: true });
    const page = await browser.newPage();

    // Set cookies if provided
    if (cookies && Array.isArray(cookies)) {
        await page.setCookie(...cookies);
    }

    // Go to dashboard
    await page.goto('https://payroll.toasttab.com/');

    // Wait for and click "Continue" button
    try {
        await page.waitForSelector('button:has-text("Continue")', { timeout: 10000 });
        await page.click('button:has-text("Continue")');
    } catch (err) {
        console.log('No Continue button found or already logged in.');
    }

    // Wait for dashboard to fully load
    await page.waitForSelector('a:has-text("View payroll")', { timeout: 15000 });
    await page.click('a:has-text("View payroll")');

    // Wait and switch to Past Payrolls tab
    await page.waitForSelector('button:has-text("Past Payrolls")', { timeout: 10000 });
    await page.click('button:has-text("Past Payrolls")');

    // Wait and click on the latest payroll "View" button
    await page.waitForSelector('a:has-text("View")', { timeout: 10000 });
    const links = await page.$$('a:has-text("View")');
    if (links.length > 0) {
        await links[0].click();
    }

    // Wait for payroll summary content to load
    await page.waitForSelector('h1', { timeout: 10000 });

    const content = await page.content();
    console.log(`✅ Payroll Summary Page Loaded. Length: ${content.length}`);

    await Apify.setValue('rawHtml', content, { contentType: 'text/html' });

    await browser.close();
});
