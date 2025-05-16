const Apify = require('apify');

Apify.main(async () => {
    console.log('✅ Actor is running successfully!');

    const input = await Apify.getInput();
    console.log('Received input:', input);
    const cookies = input.cookies;

    const browser = await Apify.launchPuppeteer({ headless: true });
    const page = await browser.newPage();

    // Inject cookies if provided
    if (cookies && Array.isArray(cookies)) {
        await page.setCookie(...cookies);
    }

    console.log('Navigating to Toast Payroll...');
    await page.goto('https://payroll.toasttab.com/', { waitUntil: 'networkidle2' });

    // Click "Continue" if it appears
    try {
        await page.waitForSelector('button:has-text("Continue")', { timeout: 5000 });
        await page.click('button:has-text("Continue")');
    } catch (err) {
        console.log('No "Continue" button found. Continuing...');
    }

    // Navigate to Payroll Dashboard
    await page.waitForSelector('a:has-text("View payroll")', { timeout: 10000 });
    await page.click('a:has-text("View payroll")');

    // Switch to Past Payrolls tab
    await page.waitForSelector('button:has-text("Past Payrolls")', { timeout: 10000 });
    await page.click('button:has-text("Past Payrolls")');

    // Click the most recent "View" button
    await page.waitForSelector('a:has-text("View")', { timeout: 10000 });
    const links = await page.$$('a:has-text("View")');
    if (links.length > 0) {
        await links[0].click();
    }

    // Wait for payroll detail page to load
    await page.waitForSelector('h1', { timeout: 10000 });

    // Extract page HTML
    const content = await page.content();

    // Save result
    await Apify.setValue('OUTPUT', {
        html: content,
        scrapedAt: new Date().toISOString()
    });

    await browser.close();
    console.log('✅ Done scraping and browser closed.');
});
