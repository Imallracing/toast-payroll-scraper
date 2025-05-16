const Apify = require('apify');
const { chromium } = require('playwright');

Apify.main(async () => {
  const input = await Apify.getInput();
  const { email, password } = input;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Login
    await page.goto('https://payroll.toasttab.com', { waitUntil: 'load' });
    await page.screenshot({ path: 'toast-login.png', fullPage: true });

    // Wait for login form to appear
    await page.waitForSelector('input[name="Email"], #Email', { timeout: 30000 });
    await page.fill('input[name="Email"], #Email', email);
    await page.fill('input[name="Password"], #Password', password);
    await page.click('button[type="submit"]');

    // 2. Wait for success or redirect
    await page.waitForURL(/dashboard/i, { timeout: 15000 });

    // 3. Handle "Remind Me Later" 2FA prompt
    const remindMeLater = page.locator('text=Remind Me Later');
    if (await remindMeLater.isVisible({ timeout: 5000 }).catch(() => false)) {
      await remindMeLater.click();
    }

    // 4. Navigate to Payroll → Past Payrolls
    await page.click('text=Payroll');
    await page.click('text=Past Payrolls');
    await page.waitForSelector('text=Weekly - WEEKLY');

    // 5. Open most recent payroll
    const latestPayroll = page.locator('text=Weekly - WEEKLY').first();
    await latestPayroll.locator('xpath=ancestor::tr').locator('text=View').click();

    // 6. Click into Payroll Summary Report
    await page.waitForSelector('text=Payroll Summary Report');
    await page.click('text=Payroll Summary Report');

    // 7. Wait for full content
    await page.waitForSelector('text=Earnings');
    const content = await page.content();

    // 8. Extract values
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
      '2210.5 - Paid Family Leave Payable': extract('CO Paid Family Leave', /Colorado Paid Family and Medical Leave - Employee\s+\$([\d,]+\.\d{2})/),
      '2215 - 401-k Payables': 2 * extract('401k', /401\(k\) Payables[^$]+?\$([\d,]+\.\d{2})/),
      '7005 - Staff Hourly': extract('REGULAR', /REGULAR\s+\$([\d,]+\.\d{2})/),
      '7015 - Manager Salary': 0,
      '7100.1 - Unemployment Taxes': extract('FUTA', /FUTA - FED\s+\$([\d,]+\.\d{2})/) + extract('SUTA', /SUTA - CO\s+\$([\d,]+\.\d{2})/),
      '7100.2 - Payroll Tax Expense': extract('ER Taxes Total', /Total<\/td>\s+<td[^>]*>\$([\d,]+\.\d{2})/) - extract('FUTA', /FUTA - FED\s+\$([\d,]+\.\d{2})/) - extract('SUTA', /SUTA - CO\s+\$([\d,]+\.\d{2})/),
      '7100.3 - Paid Family Leave Expense': extract('CO Paid Family Employer', /Colorado Paid Family and Medical Leave - Employer\s+\$([\d,]+\.\d{2})/),
      '7211 - Group Medical': 0,
      '7905 - Owner Salary': extract('SALARY', /SALARY\s+\$([\d,]+\.\d{2})/)
    };

    console.log('✅ Extracted payroll data:', data);
    await Apify.pushData(data);
  } catch (err) {
    console.error('❌ Scraper failed:', err);
    throw err;
  } finally {
    await browser.close();
  }
});
