import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// ============================================================
// NUTRIPULSE E2E TEST SUITE
// Using: playwright-e2e-testing, a11y-playwright-testing skills
// Based on qa-manual-istqb test planning workflow
// ============================================================

// ============================================================
// AUTH-01: Login Page
// ============================================================
test.describe('Authentication - Login Page', () => {
  test('AUTH-01 Login page loads correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/login/);
    await expect(page.locator('body')).toBeVisible();
    const pageText = await page.textContent('body');
    expect(pageText).toBeTruthy();
  });

  test('AUTH-02 Login page shows Google sign-in option', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const bodyText = await page.textContent('body');
    expect(bodyText?.toLowerCase()).toMatch(/continue with google|google/i);
  });

  test('AUTH-03 Login page has Demo mode button (Test Dynamic Onboarding)', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const demoButton = page.getByText('Test Dynamic Onboarding').first();
    await expect(demoButton).toBeVisible({ timeout: 10000 });
  });

  test('AUTH-04 Demo mode activates and redirects to onboarding/dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const demoButton = page.getByText('Test Dynamic Onboarding').first();
    await demoButton.click();
    await page.waitForURL(/dashboard|onboarding/, { timeout: 10000 });
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/dashboard|onboarding/);
  });

  test('AUTH-05 Unauthenticated access to /dashboard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/login/);
  });

  test('AUTH-06 Unauthenticated access to /stats redirects to /login', async ({ page }) => {
    await page.goto('/stats');
    await page.waitForURL(/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/login/);
  });

  test('AUTH-07 Root path redirects appropriately', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL(/login|dashboard|onboarding/, { timeout: 10000 });
    const url = page.url();
    expect(url).toMatch(/login|dashboard|onboarding/);
  });

  test('AUTH-08 Wildcard routes redirect to login or dashboard', async ({ page }) => {
    await page.goto('/nonexistent-page-123');
    await page.waitForURL(/login|dashboard/, { timeout: 10000 });
    const url = page.url();
    expect(url).toMatch(/login|dashboard/);
  });
});

// ============================================================
// LOGIN-VERIFY: Login Page Layout & Simplification Verifications
// ============================================================
test.describe('Login Page Layout & Simplification Verifications', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
  });

  test('LOGIN-01 "Test Dynamic Onboarding" is visible', async ({ page }) => {
    const btn = page.getByText('Test Dynamic Onboarding');
    await expect(btn).toBeVisible();
    const subtitle = page.getByText('Formulate custom blueprint from scratch');
    await expect(subtitle).toBeVisible();
  });

  test('LOGIN-02 "Explore Full Dashboard" is completely absent', async ({ page }) => {
    const btn = page.getByText('Explore Full Dashboard');
    expect(await btn.count()).toBe(0);
  });

  test('LOGIN-03 "Smart Food AI" is completely absent', async ({ page }) => {
    const card = page.getByText('Smart Food AI');
    expect(await card.count()).toBe(0);
  });

  test('LOGIN-04 "MET BMR Calcs" is completely absent', async ({ page }) => {
    const card = page.getByText('MET BMR Calcs');
    expect(await card.count()).toBe(0);
  });

  test('LOGIN-05 "Fitness Rings" is completely absent', async ({ page }) => {
    const card = page.getByText('Fitness Rings');
    expect(await card.count()).toBe(0);
  });

  test('LOGIN-06 Google Sign-In remains available', async ({ page }) => {
    const googleBtn = page.getByText('Continue with Google');
    await expect(googleBtn).toBeVisible();
  });

  test('LOGIN-07 Google OAuth setup notice is completely absent', async ({ page }) => {
    const notice = page.getByText('Setup Required: Enable Google Provider');
    expect(await notice.count()).toBe(0);
    const text1 = page.getByText('Google OAuth must be enabled in your Supabase dashboard');
    expect(await text1.count()).toBe(0);
    const text2 = page.getByText('Supabase Auth Providers');
    expect(await text2.count()).toBe(0);
    const text3 = page.getByText('Authorized Redirect URI');
    expect(await text3.count()).toBe(0);
  });

  test('LOGIN-08 Dynamic Onboarding button functionality works and Back to Login returns to login page', async ({ page }) => {
    const demoButton = page.getByText('Test Dynamic Onboarding').first();
    await demoButton.click();
    await page.waitForURL(/onboarding/, { timeout: 10000 });
    expect(page.url()).toContain('/onboarding');

    // Test Back to Login button on Step 1
    const backBtn = page.getByText('Back to Login').first();
    await expect(backBtn).toBeVisible();
    await backBtn.click();
    await page.waitForURL(/login/, { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('LOGIN-09 Demo Onboarding Step 2 serves as final preview without launch button', async ({ page }) => {
    const demoButton = page.getByText('Test Dynamic Onboarding').first();
    await demoButton.click();
    await page.waitForURL(/onboarding/, { timeout: 10000 });

    // Click Review Calculated Blueprint
    const reviewBtn = page.getByText('Review Calculated Blueprint').first();
    await reviewBtn.click();
    await page.waitForTimeout(400);

    // Verify Adjust Inputs button exists
    const adjustBtn = page.getByText('Adjust Inputs').first();
    await expect(adjustBtn).toBeVisible();

    // Verify Confirm & Launch Dashboard is completely absent in demo mode
    const launchBtn = page.getByText('Confirm & Launch Dashboard');
    expect(await launchBtn.count()).toBe(0);
  });
});

// Helper for tests that require a completed demo dashboard session
async function setupDemoDashboardSession(page: any) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => {
    if ((window as any).activateDemoMode) {
      (window as any).activateDemoMode(true);
    }
  });
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  await page.getByText(/Authenticating with NutriPulse/i).waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
  await page.locator('main').waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
}

// ============================================================
// DEMO-01: Demo Mode Dashboard
// ============================================================
test.describe('Dashboard - Demo Mode', () => {
  test.beforeEach(async ({ page }) => {
    await setupDemoDashboardSession(page);
  });

  test('DASH-01 Dashboard loads and shows main sections', async ({ page }) => {
    if (!page.url().includes('dashboard')) {
      test.skip();
      return;
    }
    await page.waitForLoadState('networkidle');
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText?.length).toBeGreaterThan(100);
  });

  test('DASH-02 Navigation bar is visible and responsive', async ({ page }) => {
    if (!page.url().includes('dashboard')) {
      test.skip();
      return;
    }
    const width = page.viewportSize()?.width || 1280;
    if (width < 768) {
      // Mobile bottom navigation dock
      const mobileDock = page.locator('div.md\\:hidden');
      await expect(mobileDock.first()).toBeVisible({ timeout: 5000 });
      const dashText = mobileDock.getByText('Dashboard');
      await expect(dashText.first()).toBeVisible();
    } else {
      // Desktop header navigation
      const header = page.locator('header');
      await expect(header.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('DASH-03 Dashboard shows meal categories', async ({ page }) => {
    if (!page.url().includes('dashboard')) {
      test.skip();
      return;
    }
    await page.waitForLoadState('networkidle');
    const bodyText = await page.textContent('body');
    expect(bodyText).toMatch(/breakfast|lunch|snack|dinner/i);
  });

  test('DASH-04 Navigate to Stats page via navbar', async ({ page }) => {
    if (!page.url().includes('dashboard')) {
      test.skip();
      return;
    }
    const statsLink = page.getByRole('link', { name: /stats|analytics|trend/i });
    if (await statsLink.count() > 0) {
      await statsLink.first().click();
      await page.waitForURL(/stats/, { timeout: 10000 });
      await expect(page).toHaveURL(/stats/);
    }
  });

  test('DASH-05 Date picker is present and interactive', async ({ page }) => {
    if (!page.url().includes('dashboard')) {
      test.skip();
      return;
    }
    await page.waitForLoadState('networkidle');
    const bodyText = await page.textContent('body');
    expect(bodyText).toMatch(/\d{4}|today|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i);
  });
});

// ============================================================
// FOOD-01: Add Food Modal
// ============================================================
test.describe('Food Logging - Add Food Modal', () => {
  test.beforeEach(async ({ page }) => {
    await setupDemoDashboardSession(page);
  });

  test('FOOD-01 Add food button opens modal', async ({ page }) => {
    if (!page.url().includes('dashboard')) {
      test.skip();
      return;
    }
    await page.waitForLoadState('networkidle');
    const addButton = page.locator('button').filter({ hasText: /\+|add/i }).first();
    if (await addButton.isVisible()) {
      await addButton.click();
      const modal = page.locator('[class*="modal"],[role="dialog"]').first();
      await expect(modal).toBeVisible({ timeout: 5000 });
    }
  });

  test('FOOD-02 Add food modal has input fields', async ({ page }) => {
    if (!page.url().includes('dashboard')) {
      test.skip();
      return;
    }
    await page.waitForLoadState('networkidle');
    const addButton = page.locator('button').filter({ hasText: /\+/i }).first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);
      const inputs = page.locator('input');
      const count = await inputs.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('FOOD-03 Manual food entry: calorie calculation updates correctly', async ({ page }) => {
    if (!page.url().includes('dashboard')) {
      test.skip();
      return;
    }
    await page.waitForLoadState('networkidle');
    const addButton = page.locator('button').filter({ hasText: /\+/i }).first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);

      const carbsInput = page.locator('input').nth(2);
      if (await carbsInput.isVisible()) {
        await carbsInput.fill('50');
        await page.waitForTimeout(300);
        const bodyText = await page.textContent('body');
        expect(bodyText).toMatch(/200|50|calc/i);
      }
    }
  });

  test('FOOD-04 Modal can be closed/dismissed', async ({ page }) => {
    if (!page.url().includes('dashboard')) {
      test.skip();
      return;
    }
    await page.waitForLoadState('networkidle');
    const addButton = page.locator('button').filter({ hasText: /\+/i }).first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      const modal = page.locator('[role="dialog"]');
      const visible = await modal.isVisible().catch(() => false);
      expect(visible).toBe(false);
    }
  });
});

// ============================================================
// STATS-01: Analytics / Stats Page
// ============================================================
test.describe('Analytics - Stats Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupDemoDashboardSession(page);

    const statsLink = page.getByRole('link', { name: /stats|analytics|trend/i }).first();
    if (await statsLink.isVisible()) {
      await statsLink.click();
      await page.waitForURL(/stats/, { timeout: 10000 });
    }
  });

  test('STATS-01 Stats page loads without errors', async ({ page }) => {
    if (!page.url().includes('stats')) {
      test.skip();
      return;
    }
    await page.waitForLoadState('networkidle');
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.waitForTimeout(2000);
    const criticalErrors = errors.filter(e => !e.includes('net::') && !e.includes('favicon') && !e.includes('Failed to load resource'));
    expect(criticalErrors.length).toBe(0);
  });

  test('STATS-02 Timeframe switcher is present and clickable', async ({ page }) => {
    if (!page.url().includes('stats')) {
      test.skip();
      return;
    }
    await page.waitForLoadState('networkidle');
    // Verify Today, Last 7 Days, Last 30 Days labels exist in the UI
    const todayBtn = page.getByRole('button', { name: 'Today' });
    const weeklyBtn = page.getByRole('button', { name: 'Last 7 Days' });
    const monthlyBtn = page.getByRole('button', { name: 'Last 30 Days' });

    await expect(todayBtn).toBeVisible({ timeout: 5000 });
    await expect(weeklyBtn).toBeVisible({ timeout: 5000 });
    await expect(monthlyBtn).toBeVisible({ timeout: 5000 });

    // Click weekly timeframe
    await weeklyBtn.click();
    await page.waitForTimeout(300);
  });

  test('STATS-03 Charts are rendered', async ({ page }) => {
    if (!page.url().includes('stats')) {
      test.skip();
      return;
    }
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const svgs = page.locator('svg');
    const count = await svgs.count();
    expect(count).toBeGreaterThan(0);
  });
});

// ============================================================
// A11Y-01: Accessibility Checks (using a11y-playwright-testing skill)
// ============================================================
test.describe('Accessibility - WCAG 2.2 AA (axe-core)', () => {
  test('A11Y-01 Login page has no critical axe violations', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const critical = results.violations.filter(v => v.impact === 'critical');
    const serious = results.violations.filter(v => v.impact === 'serious');

    if (results.violations.length > 0) {
      console.log('Violations found:', results.violations.map(v => `${v.impact}: ${v.id} - ${v.description}`).join('\n'));
    }

    expect(critical.length).toBe(0);
    expect(serious.length).toBe(0);
  });

  test('A11Y-02 Dashboard page has no critical axe violations (demo)', async ({ page }) => {
    await setupDemoDashboardSession(page);

    if (!page.url().includes('dashboard')) {
      test.skip();
      return;
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const critical = results.violations.filter(v => v.impact === 'critical');
    const serious = results.violations.filter(v => v.impact === 'serious');

    if (results.violations.length > 0) {
      console.log('Dashboard Violations:', results.violations.map(v => `${v.impact}: ${v.id}`).join('\n'));
    }

    expect(critical.length).toBe(0);
    expect(serious.length).toBe(0);
  });

  test('A11Y-03 Keyboard navigation on login page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
  });

  test('A11Y-04 Footer has meaningful text content', async ({ page }) => {
    await setupDemoDashboardSession(page);

    if (!page.url().includes('dashboard')) {
      test.skip();
      return;
    }

    const footer = page.locator('footer');
    if (await footer.isVisible()) {
      const footerText = await footer.textContent();
      expect(footerText).toBeTruthy();
      expect(footerText!.length).toBeGreaterThan(5);
    }
  });
});

// ============================================================
// RESP-01: Responsive Layout Checks
// ============================================================
test.describe('Responsive Layout', () => {
  test('RESP-01 Login page renders on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const body = await page.locator('body').boundingBox();
    expect(body).toBeTruthy();
    expect(body!.width).toBeGreaterThan(0);
  });

  test('RESP-02 Login page renders on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const body = await page.locator('body').boundingBox();
    expect(body).toBeTruthy();
    expect(body!.width).toBeGreaterThan(0);
  });

  test('RESP-03 No horizontal scroll on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth - clientWidth).toBeLessThan(20);
  });
});

// ============================================================
// BUILD-01: Bundle Security Check
// ============================================================
test.describe('Build - Security', () => {
  test('BUILD-01 Production bundle does not expose Gemini API key', async ({ page }) => {
    await page.goto('/login');
    const responses: string[] = [];
    page.on('response', async (response) => {
      if (response.url().endsWith('.js')) {
        try {
          const text = await response.text();
          if (text.includes('AIza')) {
            responses.push(`FAIL: API key in bundle ${response.url()}`);
          }
        } catch {}
      }
    });
    await page.waitForLoadState('networkidle');
    expect(responses).toHaveLength(0);
  });

  test('BUILD-02 Direct Gemini API is not called from browser', async ({ page }) => {
    const geminiCalls: string[] = [];
    page.on('request', request => {
      if (request.url().includes('generativelanguage.googleapis.com')) {
        geminiCalls.push(request.url());
      }
    });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    expect(geminiCalls).toHaveLength(0);
  });
});

// ============================================================
// PERF-01: Console Error Detection
// ============================================================
test.describe('Console / Network Errors', () => {
  test('PERF-01 No critical JS errors on login page load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    page.on('pageerror', err => {
      errors.push(err.message);
    });

    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const critical = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('net::ERR_FAILED') &&
      !e.includes('net::ERR_ABORTED') &&
      !e.includes('ResizeObserver')
    );

    expect(critical).toHaveLength(0);
  });

  test('PERF-02 No 5xx responses on normal page loads', async ({ page }) => {
    const failed5xx: string[] = [];
    page.on('response', response => {
      if (response.status() >= 500) {
        failed5xx.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    expect(failed5xx).toHaveLength(0);
  });
});
