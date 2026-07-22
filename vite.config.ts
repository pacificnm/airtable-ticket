import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function airtableAuthProxy(target: string, pat: string) {
  return {
    target,
    changeOrigin: true,
    rewrite: (path: string) =>
      path.replace(/^\/api\/airtable(-content)?/, ''),
    configure: (proxy: { on: (event: string, fn: (...args: any[]) => void) => void }) => {
      proxy.on('proxyReq', (proxyReq: { setHeader: (k: string, v: string) => void }) => {
        if (pat) {
          proxyReq.setHeader('Authorization', `Bearer ${pat}`);
        }
      });
    },
  };
}

/**
 * Airtable's REST API has no browser CORS support, so the PAT stays on the
 * Vite server and requests go through /api/airtable → api.airtable.com.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const pat = env.AIRTABLE_PAT || '';

  return {
    plugins: [react()],
    server: {
      host: true,
      proxy: {
        '/api/airtable-content': airtableAuthProxy('https://content.airtable.com', pat),
        '/api/airtable': airtableAuthProxy('https://api.airtable.com', pat),
      },
    },
  };
});
