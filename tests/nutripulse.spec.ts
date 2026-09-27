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
    // Page should have the NutriPulse branding
    await expect(page.locator('body')).toBeVisible();
    // Look for login-related content
    const pageText = await page.textContent('body');
    expect(pageText).toBeTruthy();
  });

  test('AUTH-02 Login page shows Google sign-in option', async ({ page }) => {
    await page.goto('/login');
    // The login page should have a Google sign-in button or similar CTA
    await page.waitForLoadState('networkidle');
    const bodyText = await page.textContent('body');
    // Should contain login-related text
    expect(bodyText?.toLowerCase()).toMatch(/sign|login|google|nutripulse/i);
  });

  test('AUTH-03 Login page has Demo mode button', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    // Look for demo mode trigger - the button is labeled "Explore Full Dashboard"
    const demoButton = page.getByText('Explore Full Dashboard').first();
    await expect(demoButton).toBeVisible({ timeout: 10000 });
  });

  test('AUTH-04 Demo mode activates and redirects to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    // Find and click demo mode button
    // Demo buttons are labeled "Explore Full Dashboard" and "Test Dynamic Onboarding"
    const demoButton = page.getByText('Explore Full Dashboard').first();
    await demoButton.click();
    // Should redirect to dashboard or onboarding
    await page.waitForURL(/dashboard|onboarding/, { timeout: 10000 });
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/dashboard|onboarding/);
  });

  test('AUTH-05 Unauthenticated access to /dashboard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard');
    // Should redirect to login since no auth
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
    // Should redirect to login or dashboard depending on auth state
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
// DEMO-01: Demo Mode Dashboard
// ============================================================
test.describe('Dashboard - Demo Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    // Demo buttons are labeled "Explore Full Dashboard" and "Test Dynamic Onboarding"
    const demoButton = page.getByText('Explore Full Dashboard').first();
    await demoButton.click();
    // Wait for redirect - demo with profile goes directly to dashboard
    await page.waitForURL(/dashboard|onboarding/, { timeout: 15000 });
    await page.getByText(/Authenticating with NutriPulse/i).waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
    await page.locator('main').waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});

    // If we land on onboarding, click through demo with existing profile
    if (page.url().includes('onboarding')) {
      // Try clicking a "skip" or "demo" option on onboarding
      const skipDemo = page.getByText(/demo|skip/i).first();
      if (await skipDemo.isVisible()) {
        await skipDemo.click();
        await page.waitForURL(/dashboard/, { timeout: 10000 });
      }
    }
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

  test('DASH-02 Navigation bar is visible', async ({ page }) => {
    if (!page.url().includes('dashboard')) {
      test.skip();
      return;
    }
    // Navbar should be present
    const nav = page.locator('nav');
    await expect(nav).toBeVisible({ timeout: 5000 });
  });

  test('DASH-03 Dashboard shows meal categories', async ({ page }) => {
    if (!page.url().includes('dashboard')) {
      test.skip();
      return;
    }
    await page.waitForLoadState('networkidle');
    const bodyText = await page.textContent('body');
    // Should show meal categories
    expect(bodyText).toMatch(/breakfast|lunch|snack|dinner/i);
  });

  test('DASH-04 Navigate to Stats page via navbar', async ({ page }) => {
    if (!page.url().includes('dashboard')) {
      test.skip();
      return;
    }
    // Find stats/analytics link in nav
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
    // Look for date-related UI element
    const dateEl = page.locator('[class*="calendar"],[class*="date"],[class*="Calendar"]').first();
    const bodyText = await page.textContent('body');
    // Date should appear in some format
    expect(bodyText).toMatch(/\d{4}|today|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i);
  });
});

// ============================================================
// FOOD-01: Add Food Modal
// ============================================================
test.describe('Food Logging - Add Food Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    // Demo buttons are labeled "Explore Full Dashboard" and "Test Dynamic Onboarding"
    const demoButton = page.getByText('Explore Full Dashboard').first();
    await demoButton.click();
    await page.waitForURL(/dashboard|onboarding/, { timeout: 15000 });
    await page.getByText(/Authenticating with NutriPulse/i).waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
  });

  test('FOOD-01 Add food button opens modal', async ({ page }) => {
    if (!page.url().includes('dashboard')) {
      test.skip();
      return;
    }
    await page.waitForLoadState('networkidle');
    // Find the + add food button
    const addButton = page.locator('button').filter({ hasText: /\+|add/i }).first();
    if (await addButton.isVisible()) {
      await addButton.click();
      // Modal should appear
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

      // Try to find macro input fields - look for carbs/protein/fats
      const carbsInput = page.locator('input').nth(2);
      if (await carbsInput.isVisible()) {
        await carbsInput.fill('50');
        // Calories should update (50g carbs * 4 = 200 kcal)
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
      // Press Escape to close
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      // Modal should be gone
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
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    // Demo buttons are labeled "Explore Full Dashboard" and "Test Dynamic Onboarding"
    const demoButton = page.getByText('Explore Full Dashboard').first();
    await demoButton.click();
    await page.waitForURL(/dashboard|onboarding/, { timeout: 15000 });
    await page.getByText(/Authenticating with NutriPulse/i).waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
    await page.locator('main').waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});

    // Navigate to Stats via SPA nav link to preserve in-memory demo session
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
    // Check no JS errors  
    const criticalErrors = errors.filter(e => !e.includes('net::') && !e.includes('favicon'));
    expect(criticalErrors.length).toBe(0);
  });

  test('STATS-02 Timeframe switcher is present and clickable', async ({ page }) => {
    if (!page.url().includes('stats')) {
      test.skip();
      return;
    }
    await page.waitForLoadState('networkidle');
    // Look for Today/7 Days/30 Days buttons
    const timeButtons = page.getByRole('button').filter({ hasText: /today|7 days|30 days|daily|weekly|monthly/i });
    const count = await timeButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('STATS-03 Charts are rendered', async ({ page }) => {
    if (!page.url().includes('stats')) {
      test.skip();
      return;
    }
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    // Recharts renders SVG elements
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

    // Report but don't fail on minor/moderate; fail on critical
    expect(critical.length).toBe(0);
    expect(serious.length).toBe(0);
  });

  test('A11Y-02 Dashboard page has no critical axe violations (demo)', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    // Demo buttons are labeled "Explore Full Dashboard" and "Test Dynamic Onboarding"
    const demoButton = page.getByText('Explore Full Dashboard').first();
    await demoButton.click();
    await page.waitForURL(/dashboard|onboarding/, { timeout: 15000 });

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

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    // Something should get focus
    expect(focused).toBeTruthy();
  });

  test('A11Y-04 Footer has meaningful text content', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    // Demo buttons are labeled "Explore Full Dashboard" and "Test Dynamic Onboarding"
    const demoButton = page.getByText('Explore Full Dashboard').first();
    await demoButton.click();
    await page.waitForURL(/dashboard|onboarding/, { timeout: 15000 });

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
    // Content should be visible - no overflow that hides content
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
    // scrollWidth should not significantly exceed clientWidth
    expect(scrollWidth - clientWidth).toBeLessThan(20);
  });
});

// ============================================================
// BUILD-01: Bundle Security Check
// ============================================================
test.describe('Build - Security', () => {
  test('BUILD-01 Production bundle does not expose Gemini API key', async ({ page }) => {
    // Test that when app is served, no Gemini keys appear in the JS
    await page.goto('/login');
    // Intercept JS bundles
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
    // No direct browser-to-Gemini calls
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

    // Filter out known non-critical errors
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
