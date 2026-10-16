/** @type {import('dependency-cruiser').IConfiguration} */
export default {
  // AI modified: enforce architectural directions on resolved imports, including type-only edges.
  forbidden: [
    // AI modified: Vite resolves this one virtual entry, exclusively in the example bootstrap.
    {
      name: 'mock-virtual-entry-only',
      severity: 'error',
      from: { pathNot: '^examples/contacts/main\\.ts$' },
      to: { path: '^virtual:msw$' },
    },
    {
      name: 'no-unresolved',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true, pathNot: '^virtual:msw$' },
    },
    {
      name: 'api-only-transport-and-contracts',
      severity: 'error',
      from: { path: '^src/api/' },
      to: { path: '^src/', pathNot: '^src/(api|http|types)/' },
    },
    {
      name: 'shared-not-business',
      severity: 'error',
      from: { path: '^src/(components|composables|query|config|types|styles)/' },
      to: { path: '^src/(api|pages|layouts|router|auth|stores|permissions)/' },
    },
    {
      name: 'transport-not-navigation',
      severity: 'error',
      from: { path: '^src/http/' },
      to: { path: '^src/(router|pages|components|layouts|auth|stores|permissions)/' },
    },
    {
      name: 'ui-not-higher-components',
      severity: 'error',
      from: { path: '^src/components/ui/' },
      to: { path: '^src/components/', pathNot: '^src/components/ui/' },
    },
    {
      name: 'page-private',
      severity: 'error',
      from: { path: '^src/pages/([^/]+/[^/]+)/' },
      to: { path: '^src/pages/', pathNot: '^src/pages/$1/' },
    },
    {
      name: 'production-not-examples-or-tests',
      severity: 'error',
      from: { path: '^src/', pathNot: '\\.test\\.ts$' },
      to: { path: '(^|/)(examples|tests)/|\\.test\\.ts$' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.app.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      extensions: ['.ts', '.tsx', '.vue', '.js', '.json', '.css'],
      conditionNames: ['import', 'types', 'default'],
    },
  },
};
