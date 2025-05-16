import { Actor } from 'apify';
import { chromium } from 'playwright';

await Actor.init();

// Load cookies from INPUT schema
const input = await Actor.getInput();
const cookies = input.cookies; // should be array of Playwright cookie objects
if (!cookies || !cookies.length) throw new Error('No cookies provided');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();

// Set cookies manually
await context.addCookies(cookies);

const page = await context.newPage();

// 1. Go to dashboard
await page.goto('https://payroll.toasttab.com/intajuicegreeley/dashboard', {
    waitUntil: 'domcontentloaded',
});

// 2. Click "Continue" if present
try {
    const continueButton = await page.waitForSelector('button:has-text("Continue")', { timeout: 5000 });
    await continueButton.click();
    await page.waitForLoadState('networkidle');
    console.log('✅ Clicked Continue');
} catch {
    console.log('ℹ️ No Continue button, already authorized');
}

// 3. Click "View payroll"
await page.click('text=View payroll');
await page.waitForLoadState('networkidle');

// 4. Click "Past Payrolls" tab
await page.click('text=Past Payrolls');
await page.waitForLoadState('networkidle');

// 5. Click "View" on most recent past payroll
await page.click('text=View', { timeout: 5000 });
await page.waitForLoadState('networkidle');

// 6. Extract summary
const content = await page.content();
await Actor.setValue('payroll-summary-html', content, { contentType: 'text/html' });

console.log('✅ Payroll summary page captured.');

await browser.close();
await Actor.exit();
