// toast-payroll-scraper/main.js

const { chromium } = require('playwright');
const Apify = require('apify');

Apify.main(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // 1. Login
    await page.goto('https://payroll.toasttab.com/sign-in');
    await page.fill('input[name="UserName"]', 'ijgreeleymanager@gmail.com');
    await page.click('button[type="submit"]');
    await page.waitForSelector('input[name="Password"]', { timeout: 15000 });
    await page.fill('input[name="Password"]', 'Bga2ffB2d!');
    await page.click('button[type="submit"]');

    // 2. Handle 2FA with "Remind me later"
    try {
        await page.waitForSelector('text=Remind me later', { timeout: 10000 });
        await page.click('text=Remind me later');
    } catch (err) {
        console.log('2FA reminder not shown or already passed.');
    }

    // 3. Wait for dashboard and go to Payroll > Past Payrolls
    await page.waitForSelector('text=View payroll');
    await page.goto('https://payroll.toasttab.com/intajuicegreeley/payroll/Payrolls/List?tab=1&page=1');
    await page.waitForSelector('text=View', { timeout: 15000 });
    await page.click('text=View'); // View most recent

    // 4. Click "Payroll Summary Report"
    await page.waitForSelector('text=Payroll Summary Report');
    const [newPage] = await Promise.all([
        page.waitForEvent('popup'),
        page.click('text=Payroll Summary Report')
    ]);

    await newPage.waitForLoadState('networkidle');

    // 5. Extract Data
    const data = await newPage.evaluate(() => {
        const getText = (label) => {
            const row = Array.from(document.querySelectorAll('table')).flatMap(tbl =>
                Array.from(tbl.querySelectorAll('tr')).filter(tr => tr.textContent.includes(label))
            )[0];
            if (!row) return null;
            const cells = row.querySelectorAll('td');
            return cells.length ? cells[cells.length - 1].innerText.replace(/[$,]/g, '') : null;
        };

        return {
            directDeposit: getText('Direct Deposit'),
            creditCardTips: getText('Tips Owed'),
            ficaFwtPayable: (+getText('FICA') + +getText('Federal Income Tax') - +getText('FUTA - FED')).toFixed(2),
            stateWithholding: getText('State Withholding - CO'),
            futaFed: getText('FUTA - FED'),
            sutaCO: getText('SUTA - CO'),
            paidFamilyLeave: getText('Colorado Paid Family and Medical Leave - Employee'),
            fourO1k: (parseFloat(getText('Colorado Paid Family and Medical Leave - Employer')) * 2).toFixed(2),
            staffHourly: getText('REGULAR'),
            managerSalary: getText('SALARY'),
            unemploymentTaxes: (+getText('FUTA - FED') + +getText('SUTA - CO')).toFixed(2),
            payrollTaxExpense: (+getText('Total') - +getText('SUTA - CO') - +getText('FUTA - FED')).toFixed(2),
            paidFamilyLeaveExpense: getText('Colorado Paid Family and Medical Leave - Employer'),
            ownerSalary: getText('SALARY'),
        };
    });

    console.log('Extracted Payroll Summary:', data);
    await Apify.pushData(data);

    await browser.close();
});
