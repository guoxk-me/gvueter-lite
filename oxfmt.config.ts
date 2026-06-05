import { defineConfig } from 'oxfmt'

// AI modified: use Oxfmt's native config helper for standalone config loading.
export default defineConfig({
  // AI modified: ignore generated declaration files that Vite plugins rewrite during build/test.
  ignorePatterns: ['src/auto-imports.d.ts', 'src/components.d.ts'],
  semi: false,
  singleQuote: true,
})
