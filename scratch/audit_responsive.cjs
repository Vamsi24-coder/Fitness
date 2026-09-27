const { chromium } = require('playwright');

const WIDTHS = [320, 360, 375, 390, 412, 430, 768, 820, 1024, 1280, 1366, 1440, 1920];
const BASE_URL = 'http://localhost:5173';

async function audit() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('====================================================');
  console.log('STARTING NUTRIPULSE MOBILE RESPONSIVE & OVERFLOW AUDIT');
  console.log('====================================================\n');

  const report = {};

  // Helper to check overflow
  async function checkPageOverflow(pageName) {
    console.log(`\n--> Auditing ${pageName.toUpperCase()} Page (${pageName})`);
    report[pageName] = {};
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(`${BASE_URL}${pageName}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);

      const overflow = await page.evaluate(() => {
        const docW = document.documentElement.clientWidth;
        const scrollW = document.documentElement.scrollWidth;
        const windowW = window.innerWidth;
        const offenders = [];
        document.querySelectorAll('*').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.right - docW > 1) {
            const id = el.id ? `#${el.id}` : '';
            const cls = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
            offenders.push(`${el.tagName.toLowerCase()}${id}${cls} (+${Math.round(r.right - docW)}px)`);
          }
        });
        return {
          hasOverflow: scrollW > windowW + 1,
          docW,
          scrollW,
          windowW,
          offenders: [...new Set(offenders)].slice(0, 10)
        };
      });
      report[pageName][width] = overflow;
      if (overflow.hasOverflow) {
        console.log(`  [FAIL] ${width}px: scrollWidth=${overflow.scrollW}, windowWidth=${overflow.windowW}`);
        console.log('         Offenders:', overflow.offenders.join(', '));
      } else {
        console.log(`  [OK] ${width}px clean`);
      }
    }
  }

  // 1. Audit /login
  await checkPageOverflow('/login');

  // 2. Audit /onboarding
  await checkPageOverflow('/onboarding');

  // Set demo mode in localStorage
  await page.goto(`${BASE_URL}/login`);
  await page.evaluate(() => {
    localStorage.setItem('nutripulse_demo_user', 'true');
    localStorage.setItem('nutripulse_user', JSON.stringify({
      id: 'demo-user-123',
      email: 'demo@nutripulse.app',
      user_metadata: { full_name: 'Demo Fitness User' }
    }));
    localStorage.setItem('nutripulse_profile', JSON.stringify({
      gender: 'Male',
      age: 26,
      weight: 72,
      height: 178,
      works_out: true,
      intensity: 'Medium',
      duration: 45
    }));
  });

  // 3. Audit /dashboard
  await checkPageOverflow('/dashboard');

  // 4. Audit /stats
  await checkPageOverflow('/stats');

  // 5. Audit Add Food Modal on mobile (320px, 360px, 375px, 390px)
  console.log('\n--> Auditing ADD FOOD MODAL on Mobile Viewports');
  for (const width of [320, 360, 375, 390]) {
    await page.setViewportSize({ width, height: 700 });
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    const logFoodBtn = page.locator('button', { hasText: /Log Food|\+ Add food/i }).first();
    if (await logFoodBtn.isVisible()) {
      await logFoodBtn.click();
      await page.waitForTimeout(300);
      const modalOverflow = await page.evaluate(() => {
        const docW = document.documentElement.clientWidth;
        const scrollW = document.documentElement.scrollWidth;
        const windowW = window.innerWidth;
        const modal = document.querySelector('[role="dialog"]') || document.querySelector('.glass-card');
        const modalRect = modal ? modal.getBoundingClientRect() : null;
        return {
          scrollW,
          windowW,
          hasOverflow: scrollW > windowW + 1,
          modalWidth: modalRect ? Math.round(modalRect.width) : 0,
          modalLeft: modalRect ? Math.round(modalRect.left) : 0,
          modalRight: modalRect ? Math.round(modalRect.right) : 0
        };
      });
      console.log(`  [MODAL ${width}px] modalWidth=${modalOverflow.modalWidth}px, scrollW=${modalOverflow.scrollW}, overflow=${modalOverflow.hasOverflow}`);
    }
  }

  // 6. Audit Settings Modal on Mobile
  console.log('\n--> Auditing SETTINGS MODAL on Mobile Viewports');
  for (const width of [320, 360, 375, 390]) {
    await page.setViewportSize({ width, height: 700 });
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    const settingsBtn = page.locator('button[title*="Settings"]').first();
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await page.waitForTimeout(300);
      const modalOverflow = await page.evaluate(() => {
        const docW = document.documentElement.clientWidth;
        const scrollW = document.documentElement.scrollWidth;
        const windowW = window.innerWidth;
        const modal = document.querySelector('[role="dialog"]');
        const modalRect = modal ? modal.getBoundingClientRect() : null;
        return {
          scrollW,
          windowW,
          hasOverflow: scrollW > windowW + 1,
          modalWidth: modalRect ? Math.round(modalRect.width) : 0
        };
      });
      console.log(`  [SETTINGS MODAL ${width}px] modalWidth=${modalOverflow.modalWidth}px, scrollW=${modalOverflow.scrollW}, overflow=${modalOverflow.hasOverflow}`);
    }
  }

  await browser.close();
}

audit().catch(console.error);
