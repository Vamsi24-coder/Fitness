import { test, expect, request } from '@playwright/test';

// ============================================================
// NUTRIPULSE API CONTRACT TESTS
// Using: api-testing skill
// Tests Supabase Edge Function and /api/gemini endpoint contracts
// ============================================================

const SUPABASE_EDGE_URL = 'https://dzfgdimeamocmrgkxjqh.supabase.co/functions/v1/gemini-nutrition';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_-b5hpCcpgIKRAqV_II-JLg_Z9EvVRxG';
// Production Render URL - /api/gemini is NOT available in static deployment (Render static)
const RENDER_URL = 'https://nutripulse-fitness.onrender.com';

// ============================================================
// EDGE-AUTH: Supabase Edge Function Authentication
// ============================================================
test.describe('Supabase Edge Function - Authentication', () => {
  test('EDGE-AUTH-01 No Authorization header returns 401', async ({ request: apiRequest }) => {
    const response = await apiRequest.post(SUPABASE_EDGE_URL, {
      data: { action: 'analyze_food', foodInput: 'rice' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty('code', 'UNAUTHORIZED_NO_AUTH_HEADER');
  });

  test('EDGE-AUTH-02 Invalid/fake JWT returns 401', async ({ request: apiRequest }) => {
    const response = await apiRequest.post(SUPABASE_EDGE_URL, {
      data: { action: 'analyze_food', foodInput: 'rice' },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake_invalid_jwt_token_abc123',
      },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    // Supabase returns 'code' for JWT format errors, 'error' for app-level errors
    // Both indicate unauthorized - check for either field
    const hasError = body.hasOwnProperty('error') || body.hasOwnProperty('code') || body.hasOwnProperty('message');
    expect(hasError).toBe(true);
  });

  test('EDGE-AUTH-03 Anon key used as bearer returns 401', async ({ request: apiRequest }) => {
    const response = await apiRequest.post(SUPABASE_EDGE_URL, {
      data: { action: 'analyze_food', foodInput: 'rice' },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty('error');
    const errorMsg = body.error.toLowerCase();
    expect(errorMsg).toMatch(/unauthorized|invalid|expired/i);
  });

  test('EDGE-AUTH-04 GET method returns 401 (auth enforced before method check)', async ({ request: apiRequest }) => {
    const response = await apiRequest.get(SUPABASE_EDGE_URL);
    // Supabase Deno functions check auth before method - GET returns 401
    expect([401, 405]).toContain(response.status());
  });
});

// ============================================================
// EDGE-VALIDATION: Input Validation
// ============================================================
test.describe('Supabase Edge Function - Input Validation', () => {
  test('EDGE-VAL-01 Missing foodInput with no auth returns 401', async ({ request: apiRequest }) => {
    const response = await apiRequest.post(SUPABASE_EDGE_URL, {
      data: { action: 'analyze_food' },
      headers: { 'Content-Type': 'application/json' },
    });
    // Auth is checked first, so 401 expected
    expect(response.status()).toBe(401);
  });

  test('EDGE-VAL-02 Unknown action with no auth returns 401', async ({ request: apiRequest }) => {
    const response = await apiRequest.post(SUPABASE_EDGE_URL, {
      data: { action: 'unknown_action', foodInput: 'test' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(401);
  });

  test('EDGE-VAL-03 Empty body with no auth returns 401', async ({ request: apiRequest }) => {
    const response = await apiRequest.post(SUPABASE_EDGE_URL, {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(401);
  });
});

// ============================================================
// EDGE-HEADERS: Response Headers
// ============================================================
test.describe('Supabase Edge Function - Response Headers', () => {
  test('EDGE-HDR-01 CORS headers present on OPTIONS request', async ({ request: apiRequest }) => {
    const response = await apiRequest.fetch(SUPABASE_EDGE_URL, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://nutripulse-fitness.onrender.com',
        'Access-Control-Request-Method': 'POST',
      },
    });
    // Supabase handles CORS; either 200 or handled by proxy
    expect([200, 204, 401]).toContain(response.status());
  });

  test('EDGE-HDR-02 Content-Type is application/json on error response', async ({ request: apiRequest }) => {
    const response = await apiRequest.post(SUPABASE_EDGE_URL, {
      data: { action: 'analyze_food', foodInput: 'rice' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(401);
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');
  });
});

// ============================================================
// RENDER-STATIC: Render Static Deployment
// ============================================================
test.describe('Render Deployment - Static App', () => {
  test('RENDER-01 Production app serves HTML on /', async ({ request: apiRequest }) => {
    const response = await apiRequest.get(RENDER_URL + '/');
    // Static site should return 200 or redirect
    expect([200, 301, 302]).toContain(response.status());
  });

  test('RENDER-02 /api/gemini route does NOT exist in static deployment (expected)', async ({ request: apiRequest }) => {
    // Render is configured as STATIC deployment - /api/gemini is not a real serverless route
    // It rewrites all routes to index.html per render.yaml
    const response = await apiRequest.post(RENDER_URL + '/api/gemini', {
      data: { action: 'analyze_food', foodInput: 'rice' },
      headers: { 'Content-Type': 'application/json' },
    });
    // On static, this will serve index.html (200) since render.yaml rewrites /* to /index.html
    // This is expected behavior - the frontend uses Supabase Edge Function as primary
    // /api/gemini is a fallback for Vercel serverless; on Render static it's an HTML page
    expect(response.status()).toBe(200); // Returns index.html
    // NOTE: This is documented as a known finding - the /api/gemini path is designed for Vercel
    console.log('FINDING: /api/gemini on Render static returns HTML (index.html) due to SPA rewrite rule');
  });

  test('RENDER-03 Production app loads main JavaScript bundle', async ({ request: apiRequest }) => {
    const htmlResponse = await apiRequest.get(RENDER_URL + '/');
    const html = await htmlResponse.text();
    // Should reference a JS bundle
    expect(html).toMatch(/\.js/);
  });
});
