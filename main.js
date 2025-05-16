const Apify = require('apify');
const { chromium } = require('playwright');

Apify.main(async () => {
  const input = await Apify.getInput();
  const cookies = input.cookies;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // Inject cookies
  await context.addCookies(cookies);

  const page = await context.newPage();

  console.log('Navigating to dashboard...');
  await page.goto('https://payroll.toasttab.com/mvc/intajuicegreeley/Dashboard/Root/Messages', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });

  // Wait for dashboard or Continue screen
  try {
    console.log('Checking for Continue button...');
    const continueButton = await page.$('text=Continue');
    if (continueButton) {
      console.log('Clicking Continue...');
      await continueButton.click();
      await page.waitForLoadState('networkidle');
    } else {
      console.log('No Continue button, already authorized.');
    }
  } catch (err) {
    console.warn('Continue button not found, skipping...');
  }

  // Step 1: Click Payroll
  console.log('Clicking "Payroll"...');
  await page.waitForSelector('a:has-text("Payroll")', { timeout: 10000 });
  await page.click('a:has-text("Payroll")');

  // Step 2: Click Past Payroll
  console.log('Clicking "Past Payroll"...');
  await page.waitForSelector('a:has-text("Past Payroll")', { timeout: 10000 });
  await page.click('a:has-text("Past Payroll")');

  // Step 3: Click the most recent "View" button
  console.log('Clicking first "View"...');
  await page.waitForSelector('a:has-text("View")', { timeout: 10000 });
  const viewLinks = await page.$$('a:has-text("View")');

  if (viewLinks.length === 0) throw new Error('No payroll records found');
  await viewLinks[0].click();

  // Wait for payroll summary to load
  await page.waitForLoadState('domcontentloaded');

  const content = await page.content();
  console.log('✅ Payroll Summary loaded. Content length:', content.length);

  await browser.close();
});
