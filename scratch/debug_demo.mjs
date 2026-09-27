import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const urlHistory = [];
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) {
      urlHistory.push(frame.url());
      console.log('[NAVIGATED TO]', frame.url());
    }
  });

  await page.goto('http://localhost:5173/login');
  await page.waitForTimeout(1000);

  console.log('--- Clicking Explore Full Dashboard ---');
  const btn = page.locator('button').filter({ hasText: 'Explore Full Dashboard' });
  await btn.click();
  await page.waitForTimeout(2000);

  console.log('Full URL history:', urlHistory);
  await browser.close();
})();
