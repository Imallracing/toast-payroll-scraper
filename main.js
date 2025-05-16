const Apify = require('apify');
const { chromium } = require('playwright');

Apify.main(async () => {
  const input = await Apify.getInput();
  const cookies = input.cookies;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // Inject cookies before navigation
  await context.addCookies(cookies);

  const page = await context.newPage();

  // Go to main dashboard page
  console.log('Navigating to dashboard...');
  await page.goto('https://payroll.toasttab.com/mvc/intajuicegreeley/Dashboard/Root/Messages', {
    waitUntil: 'domcontentloaded'
  });

  // Step 1: Click "Continue" button
  console.log('Clicking "Continue"...');
  await page.waitForSelector('button:has-text("Continue")', { timeout: 10000 });
  await page.click('button:has-text("Continue")');

  // Step 2: Click "Payroll"
  console.log('Clicking "Payroll"...');
  await page.waitForSelector('a:has-text("Payroll")', { timeout: 10000 });
  await page.click('a:has-text("Payroll")');

  // Step 3: Click "Past Payroll"
  console.log('Clicking "Past Payroll"...');
  await page.waitForSelector('a:has-text("Past Payroll")', { timeout: 10000 });
  await page.click('a:has-text("Past Payroll")');

  // Step 4: Click "View" for most recent payroll
  console.log('Clicking "View" on most recent payroll...');
  await page.waitForSelector('a:has-text("View")', { timeout: 10000 });
  const viewButtons = await page.$$('a:has-text("View")');

  if (viewButtons.length === 0) {
    throw new Error('❌ No "View" buttons found on Past Payroll page.');
  }

  // Assume the first one is the most recent
  await viewButtons[0].click();

  // Wait for page to load
  await page.waitForLoadState('domcontentloaded');

  // Log success and optional HTML output
  const content = await page.content();
  console.log('✅ Payroll page loaded. Content length:', content.length);

  await browser.close();
});

