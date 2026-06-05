import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, URL } from 'node:url'

import Beasties from 'beasties'
import { defineConfig } from 'vite-plus'
import type { Plugin, ResolvedConfig } from 'vite-plus'
import tailwindcss from '@tailwindcss/vite'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import vue from '@vitejs/plugin-vue'
import Inspect from 'vite-plugin-inspect'
import vueDevTools from 'vite-plugin-vue-devtools'
import Layouts from 'vite-plugin-vue-layouts'
import oxfmtConfig from './oxfmt.config'
import oxlintConfig from './oxlint.config'

interface LocalhostCertificates {
  key: Buffer
  cert: Buffer
}

interface HttpsLocalhostModule {
  getCerts: (domain?: string) => Promise<LocalhostCertificates>
}

const require = createRequire(import.meta.url)

function inlineCriticalCssPlugin(): Plugin {
  let resolvedConfig: ResolvedConfig

  return {
    name: 'gvueter-lite:beasties',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      resolvedConfig = config
    },
    async closeBundle() {
      const outputDirectory = resolve(resolvedConfig.root, resolvedConfig.build.outDir)
      const htmlFile = resolve(outputDirectory, 'index.html')
      const html = await readFile(htmlFile, 'utf8')
      const beasties = new Beasties({
        path: outputDirectory,
        preload: 'swap',
        pruneSource: false,
        logLevel: 'warn',
      })

      await writeFile(htmlFile, await beasties.process(html))
    },
  }
}

async function getLocalHttpsCertificates(): Promise<LocalhostCertificates | undefined> {
  if (process.env.VITE_HTTPS !== 'true') {
    return undefined
  }

  const httpsLocalhost = require('https-localhost/certs.js') as HttpsLocalhostModule
  return httpsLocalhost.getCerts('localhost')
}

const localHttpsCertificates = await getLocalHttpsCertificates()

// https://vite.dev/config/
export default defineConfig({
  staged: {
    '*': 'vp check --fix',
  },
  // AI modified: keep Oxfmt and Oxlint config in dedicated modules while Vite+ reads them here.
  fmt: oxfmtConfig,
  lint: oxlintConfig,
  server: {
    https: localHttpsCertificates,
  },
  // AI modified: register project-wide Vite plugins for imports, components, layouts, i18n, inspection, and critical CSS.
  plugins: [
    tailwindcss(),
    vue(),
    VueI18nPlugin({
      // AI modified: restrict i18n resources to the dedicated YAML locale directory.
      include: [fileURLToPath(new URL('./src/locales/**/*.{yaml,yml}', import.meta.url))],
      compositionOnly: true,
      runtimeOnly: true,
      strictMessage: true,
    }),
    Layouts({
      layoutsDirs: 'src/layouts',
      defaultLayout: 'DefaultLayout',
    }),
    AutoImport({
      imports: [
        'vue',
        'vue-router',
        'pinia',
        'vue-i18n',
        '@vueuse/core',
        {
          '@unhead/vue': ['createHead', 'useHead', 'useSeoMeta'],
        },
      ],
      dirs: ['src/composables'],
      dts: 'src/auto-imports.d.ts',
      vueTemplate: true,
    }),
    Components({
      dirs: ['src/components'],
      dts: 'src/components.d.ts',
    }),
    vueDevTools(),
    Inspect({
      dev: true,
      build: process.env.VITE_INSPECT_BUILD === 'true',
    }),
    inlineCriticalCssPlugin(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
