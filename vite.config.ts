import type { Buffer } from 'node:buffer'
import { createRequire } from 'node:module'
import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import Inspect from 'vite-plugin-inspect'
import vueDevTools from 'vite-plugin-vue-devtools'
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
    Inspect({
      dev: true,
      build: process.env.VITE_INSPECT_BUILD === 'true',
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
