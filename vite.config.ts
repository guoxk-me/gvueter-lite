import type { Buffer } from 'node:buffer'
import { createRequire } from 'node:module'
import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vueI18n from '@intlify/unplugin-vue-i18n/vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import Inspect from 'vite-plugin-inspect'
import vueDevTools from 'vite-plugin-vue-devtools'
import Layouts from 'vite-plugin-vue-layouts'
import { defineConfig } from 'vite-plus'

interface LocalhostCertificates {
  key: Buffer
  cert: Buffer
}

interface HttpsLocalhostModule {
  getCerts: (domain?: string) => Promise<LocalhostCertificates>
}

const require = createRequire(import.meta.url)

async function getLocalHttpsCertificates(): Promise<LocalhostCertificates | undefined> {
  if (process.env.VITE_HTTPS !== 'true') {
    return undefined
  }

  const httpsLocalhost = require('https-localhost/certs.js') as HttpsLocalhostModule
  return httpsLocalhost.getCerts('localhost')
}

const localHttpsCertificates = await getLocalHttpsCertificates()

export default defineConfig({
  // AI modified: lint source files and format config files with Vite+'s Oxc tools.
  staged: {
    '*.{js,jsx,ts,tsx,mjs,cjs,mts,cts,vue}': 'vp check --fix',
    '*.{json,jsonc,yaml,yml,md,css,html}': 'vp fmt --write --no-error-on-unmatched-pattern',
  },
  fmt: {
    // AI modified: keep agent instruction files in their hand-maintained Markdown layout.
    ignorePatterns: ['AGENTS.md', 'CLAUDE.md'],
    singleQuote: true,
    semi: false,
  },
  server: {
    https: localHttpsCertificates,
    // AI modified: an unexpected fallback port would no longer match gnester-lite's trusted login origins.
    strictPort: true,
    // AI modified: proxy the application API through one origin so browser auth cookies work locally.
    proxy: {
      '/api': {
        target: process.env.GVUETER_AUTH_TARGET || 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
  // AI modified: Vite+ now reads test settings from its shared config.
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
  },
  // AI modified: keep reusable tooling plugins without application-only build hooks.
  plugins: [
    tailwindcss(),
    vue(),
    vueDevTools(),
    // AI modified: precompile locale messages at build time instead of loading YAML as plain objects.
    vueI18n({ include: fileURLToPath(new URL('./locales/*.yaml', import.meta.url)) }),
    // AI modified: keep Vue helpers and shared UI controls available without repeated imports.
    AutoImport({
      imports: ['vue', 'vue-router'],
      dts: 'src/auto-imports.d.ts',
      dtsMode: 'overwrite',
    }),
    Components({ dirs: ['src/components/ui'], dts: 'src/components.d.ts' }),
    // AI modified: public routes use the layout plugin while the protected route keeps its existing shell.
    Layouts({
      layoutsDirs: 'src/components/layout',
      defaultLayout: 'PublicLayout',
      exclude: ['DefaultLayout.vue'],
    }),
    Inspect({
      dev: true,
      build: process.env.VITE_INSPECT_BUILD === 'true',
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@locales': fileURLToPath(new URL('./locales', import.meta.url)),
    },
  },
})
