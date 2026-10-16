import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { defineConfig } from 'vite-plus';
import { msw } from 'msw/vite';

export default defineConfig(({ mode }) => ({
  // AI modified: simultaneous app/example servers must never overwrite each other's dependency cache.
  cacheDir: `node_modules/.vite-${process.env.GVUETER_E2E ? 'e2e-' : ''}${mode}`,
  optimizeDeps: {
    entries: mode === 'examples' ? ['examples/contacts/index.html'] : ['index.html'],
  },
  plugins: [
    // AI modified: only the independent development example enables network interception.
    ...(mode === 'examples' ? [msw()] : []),
    {
      name: 'production-example-isolation',
      apply: 'build',
      generateBundle() {
        // AI modified: verify module ownership, including code whose strings would be minified away.
        for (const id of this.getModuleIds()) {
          if (id.includes('/examples/') || /[/]node_modules[/].*(msw|mockServiceWorker)/.test(id)) {
            this.error(`Development-only module in production: ${id}`);
          }
        }
      },
    },
    vue(),
    tailwindcss(),
    AutoImport({
      imports: [{ vue: ['computed', 'shallowRef'] }],
      dts: 'src/types/auto-imports.d.ts',
    }),
    Components({
      // AI modified: explicit public entries prevent private page components leaking globally.
      dirs: [],
      resolvers: [
        (name) => (name === 'Button' ? { name, from: '@/components/ui/button' } : undefined),
      ],
      dts: 'src/types/components.d.ts',
    }),
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  fmt: {
    singleQuote: true,
    ignorePatterns: [
      'docs/**',
      'pnpm-lock.yaml',
      'dist/**',
      'src/types/*.d.ts',
      'test-results/**',
      'playwright-report/**',
    ],
  },
  lint: {
    plugins: ['typescript', 'unicorn', 'oxc'],
    categories: { correctness: 'error' },
    rules: { 'no-debugger': 'error', 'typescript/no-explicit-any': 'error' },
    // AI modified: vue-tsc owns SFC types; lint never loads an ESLint compatibility plugin.
    options: { typeAware: false, typeCheck: false },
    ignorePatterns: ['src/types/*.d.ts', 'dist/**', 'test-results/**', 'playwright-report/**'],
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
}));
