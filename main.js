await page.goto('https://payroll.toasttab.com', { waitUntil: 'domcontentloaded', timeout: 60000 });

// Fill login and click “Next”
await page.waitForSelector('#username', { timeout: 30000 });
await page.fill('#username', email);
await page.click('button[type="submit"]');

// Wait for Cloudflare or redirect to auth.toasttab
await page.waitForLoadState('networkidle', { timeout: 60000 });

// You can also double-check the domain:
if (!page.url().includes('auth.toasttab.com')) {
  throw new Error('Did not redirect to auth.toasttab.com, stuck on CAPTCHA or network block.');
}

// Now wait for the password field
await page.waitForSelector('input[type="password"]', { timeout: 30000 });
await page.fill('input[type="password"]', password);
await page.click('button[type="submit"]');

// Again wait for load/network idle to ensure login completes
await page.waitForLoadState('networkidle', { timeout: 60000 });

// Optional dashboard check
await page.waitForURL(/dashboard/i, { timeout: 60000 });

