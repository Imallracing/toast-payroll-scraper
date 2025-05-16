const Apify = require('apify');
const { chromium } = require('playwright');

Apify.main(async () => {
  const input = await Apify.getInput();
  const { email, password } = input;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Go to login page and wait for all network requests to finish
    await page.goto('https://payroll.toasttab.com', { waitUntil: 'networkidle' });

    // Optional debug screenshot
    await page.screenshot({ path: 'toast-login.png', fullPage: true });

    // 2. Let any JS-heavy elements settle
    await page.waitForTimeout(5000);

    // 3. Wait for either input[name=Email] or #Email
    await page.waitForSelector('input[name="Email"], #Email', { timeout: 30000 });

    // 4. Fill in credentials (robust selector)
    await page.fill('input[name="Email"], #Email', email);
    await page.fill('#Password', password);
    await page.click('button[type="submit"]');

    // 5. Wait for redirect to dashboard or throw
    await page.waitForURL(/dashboard/i, { timeout: 15000 });

    // 6. Optional: Dismiss 2FA modal
    const remindMe = page.locator('text=Remind Me Later');
    if (await remindMe.isVisible({ timeout: 5000 }).catch(() => false)) {
      await remindMe.click();
    }

    // 7. Go to Past Payrolls
    await page.click('text=Payroll');
    await page.click('text=Past Payrolls');

    // 8. Wait for most recent payroll
    await page.waitForSelector('text=Weekly - WEEKLY');
    const latestPayroll = page.locator('text=Weekly - WEEKLY').first();
    await latestPayroll.locator('xpath=ancestor::tr').locator('text=View').click();

    // 9. Open Payroll Summary Report
    await page.waitForSelector('text=Payroll Summary Report');
    await page.click('text=Payroll Summary Report');

    // 10. Wait for earnings to load
    await page.waitForSelector('text=Earnings');
    const content = await page.content();

    // 11. Extract and parse
    const extract = (label, pattern) => {
      const match = content.match(pattern);
      return match ? parseFloat(match[1].replace(/[$,]/g, '')) : 0;
    };

    const data = {
      '100-checking': extract('Direct Deposit', /Direct Deposit[^$]+?\$([\d,]+\.\d{2})/),
      '2085 - Credit Card Tip Payable': extract('Tips Owed', /Tips Owed\s+\$([\d,]+\.\d{2})/),
      '2210.1 - FICA/FWT Payable': extract('FICA + Fed', /FICA\s+\$([\d,]+\.\d{2}).+?FUTA - FED\s+\$([\d,]+\.\d{2})/s) - extract('FUTA - FED', /FUTA - FED\s+\$([\d,]+\.\d{2})/),
      '2210.2 - State Withholding Payable': extract('State Withholding - CO', /State Withholding - CO\s+\$([\d,]+\.\d{2})/),
      '2210.3 - Federal Unemployment Payable': extract('FUTA - FED', /FUTA - FED\s+\$([\d,]+\.\d{2})/),
      '2210.4 - State Unemployment Payable': extract('SUTA - CO', /SUTA - CO\s+\$([\d,]+\.\d{2})/),
      '2210.5 - Paid Family Leave Payable': extract('CO FML - Employee', /Colorado Paid Family and Medical Leave - Employee\s+\$([\d,]+\.\d{2})/),
      '2215 - 401-k Payables': 2 * extract('401k', /401\(k\) Payables[^$]+?\$([\d,]+\.\d{2})/),
      '7005 - Staff Hourly': extract('REGULAR', /REGULAR\s+\$([\d,]+\.\d{2})/),
      '7015 - Manager Salary': 0,
      '7100.1 - Unemployment Taxes': extract('FUTA', /FUTA - FED\s+\$([\d,]+\.\d{2})/) + extract('SUTA', /SUTA - CO\s+\$([\d,]+\.\d{2})/),
      '7100.2 - Payroll Tax Expense': extract('ER Taxes Total', /Total<\/td>\s+<td[^>]*>\$([\d,]+\.\d{2})/) - extract('FUTA', /FUTA - FED\s+\$([\d,]+\.\d{2})/) - extract('SUTA', /SUTA - CO\s+\$([\d,]+\.\d{2})/),
      '7100.3 - Paid Family Leave Expense': extract('CO FML - Employer', /Colorado Paid Family and Medical Leave - Employer\s+\$([\d,]+\.\d{2})/),
      '7211 - Group Medical': 0,
      '7905 - Owner Salary': extract('SALARY', /SALARY\s+\$([\d,]+\.\d{2})/)
    };

    console.log('✅ Payroll Data Extracted:', data);
    await Apify.pushData(data);
  } catch (err) {
    console.error('❌ Scraper failed:', err);
    throw err;
  } finally {
    await browser.close();
  }
});
