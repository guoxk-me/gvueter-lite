import antfu from '@antfu/eslint-config'
import playwright from 'eslint-plugin-playwright'

export default antfu(
  {
    ignores: [
      'dist/**',
      'dist-ssr/**',
      'coverage/**',
      'src/auto-imports.d.ts',
      'src/components.d.ts',
    ],
    stylistic: {
      indent: 2,
      quotes: 'single',
      semi: false,
    },
    typescript: {
      tsconfigPath: 'tsconfig.json',
    },
    vue: true,
  },
  {
    ...playwright.configs['flat/recommended'],
    // AI modified: preserve Playwright checks in the ESLint migration.
    files: ['e2e/**/*.{test,spec}.{js,ts,jsx,tsx}'],
  },
  {
    files: ['pnpm-workspace.yaml'],
    rules: {
      // AI modified: allow the project to disable pnpm trust policy by request.
      'pnpm/yaml-enforce-settings': 'off',
    },
  },
)
