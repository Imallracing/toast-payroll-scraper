const Apify = require('apify');
const { chromium } = require('playwright');

Apify.main(async () => {
  const input = await Apify.getInput();
  const { email, password } = input;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://payroll.toasttab.com');

  await page.fill('#Email', email);
  await page.fill('#Password', password);
  await page.click('button[type="submit"]');

  // wait for dashboard or check login success
  await page.waitForURL(/dashboard/i, { timeout: 10000 });


  // Handle 2FA bypass
  const remindMeLater = await page.locator('text=Remind Me Later');
  if (await remindMeLater.isVisible({ timeout: 5000 })) {
    await remindMeLater.click();
  }

  // Wait for dashboard
  await page.waitForURL('**/dashboard');

  // Navigate to Payroll → Past Payrolls
  await page.click('text=Payroll');
  await page.click('text=Past Payrolls');

  // Wait for past payroll list
  await page.waitForSelector('text=Weekly - WEEKLY');

  // Click the most recent “View” link
  const latestPayroll = page.locator('text=Weekly - WEEKLY').first();
  await latestPayroll.locator('xpath=ancestor::tr').locator('text=View').click();

  // Click into Payroll Summary Report
  await page.waitForSelector('text=Payroll Summary Report');
  await page.click('text=Payroll Summary Report');

  // Wait for report content
  await page.waitForSelector('text=Earnings');

  // Extract text content
  const content = await page.content();

  // Parse values with regex
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
    '2210.5 - Paid Family Leave Payable': extract('Colorado Paid Family and Medical Leave - Employee', /Colorado Paid Family and Medical Leave - Employee\s+\$([\d,]+\.\d{2})/),
    '2215 - 401-k Payables': 2 * extract('401k', /401\(k\) Payables[^$]+?\$([\d,]+\.\d{2})/),
    '7005 - Staff Hourly': extract('REGULAR', /REGULAR\s+\$([\d,]+\.\d{2})/),
    '7015 - Manager Salary': 0,
    '7100.1 - Unemployment Taxes': extract('FUTA', /FUTA - FED\s+\$([\d,]+\.\d{2})/) + extract('SUTA', /SUTA - CO\s+\$([\d,]+\.\d{2})/),
    '7100.2 - Payroll Tax Expense': extract('ER Taxes Total', /Total<\/td>\s+<td[^>]*>\$([\d,]+\.\d{2})/) - extract('FUTA', /FUTA - FED\s+\$([\d,]+\.\d{2})/) - extract('SUTA', /SUTA - CO\s+\$([\d,]+\.\d{2})/),
    '7100.3 - Paid Family Leave Expense': extract('Colorado Paid Family and Medical Leave - Employer', /Colorado Paid Family and Medical Leave - Employer\s+\$([\d,]+\.\d{2})/),
    '7211 - Group Medical': 0,
    '7905 - Owner Salary': extract('SALARY', /SALARY\s+\$([\d,]+\.\d{2})/)
  };

  return data;
}

exports.default = async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const results = await loginAndScrape(page);
    console.log('✅ Extracted Payroll Data:', results);
    await Apify.pushData(results);
  } catch (err) {
    console.error('❌ Failed to extract payroll:', err);
    throw err;
  } finally {
    await browser.close();
  }
};
