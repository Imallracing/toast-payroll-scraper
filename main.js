const Apify = require('apify');

Apify.main(async () => {
    console.log('✅ Actor is running successfully!');

    const input = await Apify.getInput();
    const cookies = input.cookies;

    const browser = await Apify.launchPuppeteer({ headless: true });
    const page = await browser.newPage();

    if (cookies && Array.isArray(cookies)) {
        await page.setCookie(...cookies);
    }

    console.log('Navigating to Toast Payroll...');
    await page.goto('https://payroll.toasttab.com/', { waitUntil: 'networkidle2' });

    // Click "Continue" if present
    try {
        await page.waitForSelector('button', { timeout: 5000 });
        const continueBtn = await page.$x("//button[contains(., 'Continue')]");
        if (continueBtn.length > 0) {
            await continueBtn[0].click();
            console.log('Clicked "Continue" button.');
        } else {
            console.log('"Continue" button not found.');
        }
    } catch (err) {
        console.log('No "Continue" button, skipping...');
    }

    // Go to Payroll
    await page.waitForSelector('a', { timeout: 10000 });
    const payrollLink = await page.$x("//a[contains(., 'View payroll')]");
    if (payrollLink.length > 0) {
        await payrollLink[0].click();
    }

    // Click Past Payrolls tab
    await page.waitForSelector('button', { timeout: 10000 });
    const pastBtn = await page.$x("//button[contains(., 'Past Payrolls')]");
    if (pastBtn.length > 0) {
        await pastBtn[0].click();
    }

    // Click first View link
    await page.waitForSelector('a', { timeout: 10000 });
    const viewBtns = await page.$x("//a[contains(., 'View')]");
    if (viewBtns.length > 0) {
        await viewBtns[0].click();
    }

    await page.waitForSelector('h1', { timeout: 10000 });

    const content = await page.content();

    await Apify.setValue('OUTPUT', {
        html: content,
        timestamp: new Date().toISOString()
    });

    await browser.close();
});
