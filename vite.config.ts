import type { Buffer } from 'node:buffer'
import type { Plugin, ResolvedConfig } from 'vite-plus'
import type { ViteSSGOptions } from 'vite-ssg'
import { readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import Beasties from 'beasties'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import Inspect from 'vite-plugin-inspect'
import { VitePWA } from 'vite-plugin-pwa'
import vueDevTools from 'vite-plugin-vue-devtools'
import Layouts from 'vite-plugin-vue-layouts'
import { defineConfig } from 'vite-plus'
import generateSitemap from 'vite-ssg-sitemap'

declare module 'vite-plus' {
  interface UserConfig {
    // AI modified: vite-ssg augments Vite types, so Vite+ needs the same option.
    ssgOptions?: ViteSSGOptions
  }
}

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
  let isSsrBuild = false

  return {
    name: 'gvueter-lite:beasties',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      resolvedConfig = config
      isSsrBuild = Boolean(config.build.ssr)
    },
    async closeBundle() {
      // AI modified: vite-ssg server builds do not emit an index.html for Beasties.
      if (isSsrBuild) {
        return
      }

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
    // AI modified: run staged checks through ESLint autofix.
    '*': 'eslint --fix',
  },
  server: {
    https: localHttpsCertificates,
  },
  ssgOptions: {
    // AI modified: generate search-engine files after vite-ssg writes static HTML.
    onFinished() {
      generateSitemap({
        hostname: process.env.VITE_SITE_URL ?? 'http://localhost/',
        readable: true,
      })
    },
  },
  // AI modified: register project-wide Vite plugins for imports, components, layouts, i18n, inspection, and critical CSS.
  plugins: [
    tailwindcss(),
    vue(),
    VueI18nPlugin({
      // AI modified: restrict i18n resources to the dedicated YAML locale directory.
      include: [fileURLToPath(new URL('./locales/**/*.{yaml,yml}', import.meta.url))],
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
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'gvueter-lite',
        short_name: 'gvueter-lite',
        description: 'gvueter-lite',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
      },
      devOptions: {
        enabled: true,
      },
    }),
    inlineCriticalCssPlugin(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
