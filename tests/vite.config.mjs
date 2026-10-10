import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const mock = resolve(root, 'tests/helpers/mock-supabase.js')
export default defineConfig({
  root,
  // Never read .env.local in the test server.
  envDir: resolve(root, 'tests/fixtures'),
  plugins: [
    {
      name: 'baseline-fixture-only', enforce: 'pre',
      resolveId(id, importer) {
        if (id === './supabase' && importer?.replaceAll('\\', '/').endsWith('/src/lib/store.js')) return mock
        if (id.replaceAll('\\', '/').endsWith('/src/lib/supabase.js')) return mock
      },
      transform(source, id) {
        if (id.replaceAll('\\', '/').endsWith('/src/main.jsx')) return source + `
          import { useStore as baselineStore } from './lib/store';
          import { backend as baselineBackend } from '../tests/helpers/mock-supabase.js';
          window.__baseline = { store: baselineStore, backend: baselineBackend };
        `
      },
    },
    react(),
  ],
  server: { host: '127.0.0.1', port: 0 },
})
