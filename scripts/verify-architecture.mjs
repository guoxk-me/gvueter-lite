import { readdir, readFile } from 'node:fs/promises'
import { dirname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const genericComponentOwners = new Set(['ui', 'form', 'data-table', 'overlay'])
const genericTypeOwners = new Set(['form', 'data-table', 'overlay', 'http', 'theme', 'i18n'])
const genericComposables = new Set(['composables/use-data-table', 'composables/use-theme'])
const uiTypeOwners = new Set(['form', 'data-table', 'overlay', 'login', 'theme', 'web-mcp'])
// AI modified: concept names preserve the API/UI boundary after removing implementation-based filenames.
const uiTypeConcepts = new Set([
  'drafts',
  'component-contracts',
  'reading-position',
  'answer-content',
])

// AI modified: explicit imports, type queries and literal dynamic imports share the same boundary checks.
export function sourceDependencies(sourceFile) {
  const dependencies = []
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      const bindings = ts.isImportDeclaration(node)
        ? node.importClause?.namedBindings
        : node.exportClause
      const isTypeOnly = Boolean(
        node.isTypeOnly ||
        node.importClause?.isTypeOnly ||
        (bindings &&
          (ts.isNamedImports(bindings) || ts.isNamedExports(bindings)) &&
          bindings.elements.length > 0 &&
          bindings.elements.every((binding) => binding.isTypeOnly)),
      )
      dependencies.push({ specifier: node.moduleSpecifier.text, isTypeOnly })
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteralLike(node.argument.literal)
    ) {
      dependencies.push({ specifier: node.argument.literal.text, isTypeOnly: true })
    } else if (
      ts.isCallExpression(node) &&
      node.arguments.length > 0 &&
      ts.isStringLiteralLike(node.arguments[0]) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
    ) {
      dependencies.push({ specifier: node.arguments[0].text, isTypeOnly: false })
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return dependencies
}

export function sourceCode(file, text) {
  if (!file.endsWith('.vue')) return text
  // Vue generic attributes may themselves contain >; a tag ends outside quoted attributes.
  const headers = /<script\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gu
  const scripts = []
  for (let header = headers.exec(text); header; header = headers.exec(text)) {
    const start = header.index + header[0].length
    const end = text.indexOf('</script>', start)
    if (end === -1) throw new Error(`Unclosed script tag in ${file}`)
    scripts.push(text.slice(start, end))
    headers.lastIndex = end + '</script>'.length
  }
  return scripts.join('\n')
}

function dependencyPath(file, specifier) {
  if (specifier.startsWith('@/'))
    return relative('/src', resolve('/src', specifier.slice(2)))
      .split(sep)
      .join('/')
  if (specifier.startsWith('@locales/')) return '../locales/' + specifier.slice('@locales/'.length)
  if (specifier.startsWith('.'))
    return relative('/src', resolve('/src', dirname(file), specifier))
      .split(sep)
      .join('/')
  return null
}

export function inspectSource(file, text) {
  const violations = []
  const sourceFile = ts.createSourceFile(
    file,
    sourceCode(file, text),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const owner = file.split('/')[0]
  const isTest = /\.(spec|test)\.[cm]?[jt]s$/u.test(file)
  const isDeclaration = file.endsWith('.d.ts')
  const isThirdParty = file.startsWith('components/ui/')
  const isTypes = owner === 'types'
  const pageOwner = owner === 'pages' ? file.split('/')[1] : undefined
  // AI modified: every page has its own entry and private supporting files.
  if (owner === 'pages' && file.split('/').length < 3)
    violations.push('page files belong in pages/<page>/ with an index.vue entry')
  // AI modified: page roots expose only the entry; support files use responsibility subdirectories.
  if (owner === 'pages' && file.split('/').length === 3 && !file.endsWith('/index.vue'))
    violations.push('page root contains only index.vue; move supporting files to subdirectories')
  if (
    owner === 'pages' &&
    file.endsWith('.vue') &&
    !/^pages\/[^/]+\/index\.vue$/u.test(file) &&
    file.split('/')[2] !== 'components'
  )
    violations.push('page-private Vue components belong in components/')
  if (
    owner === 'pages' &&
    !isTest &&
    /^use-.+\.ts$/u.test(file.split('/').at(-1)) &&
    file.split('/')[2] !== 'composables'
  )
    violations.push('page-private composables belong in composables/')

  for (const node of sourceFile.statements) {
    if (isTypes) {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        // Dependency checks below verify type-only imports and re-exports.
        if (ts.isExportDeclaration(node) && !node.isTypeOnly && !node.moduleSpecifier)
          violations.push('types contains a runtime export')
      } else if (
        !ts.isInterfaceDeclaration(node) &&
        !ts.isTypeAliasDeclaration(node) &&
        !ts.isEmptyStatement(node)
      ) {
        violations.push('types contains runtime code')
      }
    } else if (
      !isTest &&
      !isDeclaration &&
      !isThirdParty &&
      (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node))
    ) {
      violations.push(`pure type ${node.name.text} belongs in types/`)
    }
  }

  for (const { specifier, isTypeOnly } of sourceDependencies(sourceFile)) {
    const target = dependencyPath(file, specifier)
    const targetOwner = target?.split('/')[0]
    const typeOwner = targetOwner === 'types' ? target.split('/')[1] : undefined
    const componentOwner = file.split('/')[1]
    if (isTypes && (!isTypeOnly || (target && targetOwner !== 'types')))
      violations.push(`types must only import/export types: ${specifier}`)
    if (targetOwner === 'pages') {
      const targetPageOwner = target.split('/')[1]
      const isPageEntry = /^pages\/[^/]+\/index\.vue$/u.test(target)
      const isSamePage = pageOwner === targetPageOwner
      if (!isSamePage && !isPageEntry)
        violations.push(`page-private file cannot be imported outside its page: ${specifier}`)
      if (!isSamePage && isPageEntry && owner !== 'router' && !isTest)
        violations.push(`page entries are composed by the router: ${specifier}`)
    }
    if (isTest || isDeclaration) continue
    if (targetOwner === 'types' && !isTypeOnly) violations.push(`use import type for ${specifier}`)
    if (
      owner === 'api' &&
      ((target && !['api', 'http', 'types'].includes(targetOwner)) ||
        ['vue', 'vue-router', 'pinia', '@tanstack/vue-query', 'vue-sonner'].includes(specifier))
    ) {
      violations.push(`API depends on UI or workflow: ${specifier}`)
    }
    if (owner === 'http' && target && !['http', 'types'].includes(targetOwner))
      violations.push(`HTTP depends on an application layer: ${specifier}`)
    if (owner === 'http' && typeOwner && typeOwner !== 'http')
      violations.push(`HTTP depends on non-transport types: ${specifier}`)
    if (
      owner === 'api' &&
      (uiTypeOwners.has(typeOwner) ||
        (typeOwner && uiTypeConcepts.has(target.split('/').at(-1).replace(/\.ts$/u, ''))) ||
        /(?:-page|-props|-component)-types(?:\.ts)?$/u.test(target ?? ''))
    )
      violations.push(`API depends on UI types: ${specifier}`)
    if (
      (owner === 'components' ||
        (owner === 'pages' &&
          file.endsWith('.vue') &&
          !/^pages\/[^/]+\/index\.vue$/u.test(file))) &&
      targetOwner === 'http'
    )
      violations.push(`component calls HTTP directly: ${specifier}`)
    if (
      owner === 'http' &&
      ['vue', 'vue-router', 'pinia', '@tanstack/vue-query', 'vue-sonner'].includes(specifier)
    )
      violations.push(`HTTP depends on UI or workflow: ${specifier}`)
    if (
      owner === 'components' &&
      genericComponentOwners.has(componentOwner) &&
      (targetOwner === 'api' ||
        (targetOwner === 'components' && !genericComponentOwners.has(target.split('/')[1])) ||
        (typeOwner && !genericTypeOwners.has(typeOwner)) ||
        (targetOwner === 'composables' &&
          !genericComposables.has(target.replace(/\.ts$/u, '')) &&
          !['form', 'data-table', 'overlay'].includes(target.split('/')[1])))
    ) {
      violations.push(`generic component depends on business: ${specifier}`)
    }
  }
  return [...new Set(violations)]
}

async function sourceFiles(directory) {
  return (
    await Promise.all(
      (await readdir(directory, { withFileTypes: true })).map(async (entry) => {
        const path = resolve(directory, entry.name)
        return entry.isDirectory() ? sourceFiles(path) : /\.(vue|ts)$/u.test(path) ? [path] : []
      }),
    )
  ).flat()
}

export async function verifyArchitecture(projectRoot = process.cwd()) {
  const sourceRoot = resolve(projectRoot, 'src')
  const files = await sourceFiles(sourceRoot)
  const violations = []
  const paths = new Set(files.map((file) => relative(sourceRoot, file).split(sep).join('/')))
  const pagesDirectory = resolve(sourceRoot, 'pages')
  const pageDirectories = await readdir(pagesDirectory, { withFileTypes: true }).catch((error) => {
    if (error.code === 'ENOENT') return []
    throw error
  })
  for (const pageDirectory of pageDirectories.filter((entry) => entry.isDirectory())) {
    const pageOwner = pageDirectory.name
    if (!paths.has(`pages/${pageOwner}/index.vue`))
      violations.push(`pages/${pageOwner}: missing index.vue entry`)
    // Check all root files, including Markdown guidance that is outside the source AST.
    for (const entry of await readdir(resolve(pagesDirectory, pageOwner), {
      withFileTypes: true,
    })) {
      if (!entry.isDirectory() && entry.name !== 'index.vue')
        violations.push(`pages/${pageOwner}/${entry.name}: page root contains only index.vue`)
    }
  }
  for (const file of files) {
    const path = relative(sourceRoot, file).split(sep).join('/')
    for (const violation of inspectSource(path, await readFile(file, 'utf8')))
      violations.push(`${path}: ${violation}`)
  }
  if (violations.length) throw new Error(`Architecture violations:\n${violations.join('\n')}`)
  return files.length
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Verified folder responsibilities across ${await verifyArchitecture()} source files.`)
}
