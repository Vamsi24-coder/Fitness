import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Populate backend-only secrets into process.env for local dev server middleware
  if (env.GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
  }
  if (env.GEMINI_FALLBACK_API_KEY) {
    process.env.GEMINI_FALLBACK_API_KEY = env.GEMINI_FALLBACK_API_KEY;
  }
  if (env.GEMINI_COACH_API_KEY) {
    process.env.GEMINI_COACH_API_KEY = env.GEMINI_COACH_API_KEY;
  }
  if (env.VITE_SUPABASE_URL) {
    process.env.VITE_SUPABASE_URL = env.VITE_SUPABASE_URL;
  }
  if (env.VITE_SUPABASE_ANON_KEY) {
    process.env.VITE_SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;
  }

  return {
    plugins: [
      react(),
      {
        name: 'gemini-dev-api-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url && req.url.startsWith('/api/gemini')) {
              try {
                const { default: handler } = await import('./api/gemini.js');
                let rawBody = '';
                req.on('data', (chunk) => {
                  rawBody += chunk;
                });
                req.on('end', async () => {
                  try {
                    req.body = rawBody ? JSON.parse(rawBody) : {};
                  } catch {
                    req.body = {};
                  }
                  // Polyfill Express-like response helpers for handler compatibility
                  res.status = (code) => {
                    res.statusCode = code;
                    return res;
                  };
                  res.json = (data) => {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(data));
                    return res;
                  };
                  await handler(req, res);
                });
              } catch (err) {
                console.error('[Vite Dev Server API Error]:', err);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Internal dev server error' }));
              }
              return;
            }
            next();
          });
        },
      },
    ],
  };
});
