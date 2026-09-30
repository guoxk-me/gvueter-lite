import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { inspectSource, verifyArchitecture } from './verify-architecture.mjs'

// AI modified: page-private files stay local, including test imports and dynamic references.
test('page entries and private supporting files have distinct consumers', () => {
  const component =
    '<script setup lang="ts">import LoginForm from "./components/LoginForm.vue"</script>'
  assert.deepEqual(inspectSource('pages/login/index.vue', component), [])
  assert.deepEqual(
    inspectSource(
      'pages/login/tests/index.spec.ts',
      "import Form from '../components/LoginForm.vue'",
    ),
    [],
  )
  assert.deepEqual(
    inspectSource('router/index.ts', "const page = import('@/pages/login/index.vue')"),
    [],
  )
  for (const [file, code] of [
    [
      'pages/users/index.vue',
      '<script setup lang="ts">import LoginForm from "../login/components/LoginForm.vue"</script>',
    ],
    [
      'layouts/DefaultLayout.vue',
      '<script setup lang="ts">const tools = import("@/pages/login/composables/use-login-web-mcp")</script>',
    ],
    [
      'components/AccountForm.vue',
      '<script setup lang="ts">import Form from "@/pages/login/components/LoginForm.vue"</script>',
    ],
    [
      'composables/use-session.ts',
      'export { useLoginWebMcp } from "@/pages/login/composables/use-login-web-mcp"',
    ],
    [
      'pages/users/tests/index.spec.ts',
      'import type { Form } from "../../login/components/LoginForm.vue"',
    ],
    [
      'router/index.ts',
      'import { useLoginWebMcp } from "@/pages/login/composables/use-login-web-mcp"',
    ],
    [
      'components/Shell.vue',
      '<script setup lang="ts">import Page from "@/pages/login/index.vue"</script>',
    ],
    [
      'pages/login/components/LoginForm.vue',
      '<script setup lang="ts">import { http } from "@/http/http-client"</script>',
    ],
    [
      'pages/login/components/index.vue',
      '<script setup lang="ts">import { http } from "@/http/http-client"</script>',
    ],
  ]) {
    assert.ok(inspectSource(file, code).length, `${file}: ${code}`)
  }
  assert.ok(inspectSource('pages/LoginPage.vue', '<template>Login</template>').length)
})

test('a page directory must contain its own index.vue entry', async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), 'page-architecture-'))
  try {
    await mkdir(join(projectRoot, 'src/pages/login/components'), { recursive: true })
    await writeFile(
      join(projectRoot, 'src/pages/login/components/LoginForm.vue'),
      '<template>Login</template>',
    )
    await assert.rejects(verifyArchitecture(projectRoot), /missing index\.vue entry/)
    await writeFile(join(projectRoot, 'src/pages/login/index.vue'), '<template>Login</template>')
    assert.equal(await verifyArchitecture(projectRoot), 2)
  } finally {
    await rm(projectRoot, { recursive: true, force: true })
  }
})

// AI modified: root-file restrictions also cover non-source files and misplaced support code.
test('page support files use subdirectories and roots contain only the entry', async () => {
  for (const file of [
    'pages/login/LoginForm.vue',
    'pages/login/use-login-web-mcp.ts',
    'pages/login/index.spec.ts',
    'pages/login/tests/LoginForm.vue',
    'pages/login/components/use-login-web-mcp.ts',
  ]) {
    assert.ok(inspectSource(file, '').length, file)
  }
  assert.deepEqual(inspectSource('pages/login/composables/use-login-web-mcp.ts', ''), [])
  const projectRoot = await mkdtemp(join(tmpdir(), 'page-root-'))
  try {
    await mkdir(join(projectRoot, 'src/pages/login'), { recursive: true })
    await writeFile(join(projectRoot, 'src/pages/login/index.vue'), '<template>Login</template>')
    assert.equal(await verifyArchitecture(projectRoot), 1)
    await writeFile(join(projectRoot, 'src/pages/login/AGENTS.md'), '# Guidance')
    await assert.rejects(
      verifyArchitecture(projectRoot),
      /AGENTS\.md: page root contains only index\.vue/,
    )
    await rm(join(projectRoot, 'src/pages/login/AGENTS.md'))
    assert.equal(await verifyArchitecture(projectRoot), 1)
  } finally {
    await rm(projectRoot, { recursive: true, force: true })
  }
})

// AI modified: UI concepts remain private to presentation even when their files no longer name a page.
test('API rejects UI concepts while accepting business contracts', () => {
  for (const specifier of [
    '@/types/users/drafts',
    '../types/assistant/reading-position.ts',
    '@/types/assistant/answer-content',
    '@/types/orders/component-contracts',
  ]) {
    assert.ok(inspectSource('api/users-api.ts', `import type { Draft } from '${specifier}'`).length)
  }
  assert.deepEqual(
    inspectSource(
      'api/users-api.ts',
      "import type { InvitationRecord } from '@/types/users/invitation'",
    ),
    [],
  )
})

// AI modified: fixtures prove forbidden imports fail even in Vue scripts and dynamic type queries.
test('API rejects UI imports through aliases and relative paths', () => {
  assert.ok(inspectSource('api/users-api.ts', "import Page from '@/pages/users/index.vue'").length)
  assert.ok(
    inspectSource('api/users-api.ts', "const page = import('../pages/users/index.vue')").length,
  )
  assert.ok(
    inspectSource('api/users-api.ts', "type User = import('../components/users/user-types').User")
      .length,
  )
  assert.deepEqual(
    inspectSource(
      'api/users-api.ts',
      "import { http } from '@/http/http-client'\nimport type { UserRecord } from '@/types/users/user'",
    ),
    [],
  )
})
test('types rejects runtime declarations and implementation dependencies', () => {
  for (const code of [
    "export const role = 'admin'",
    'export class User {}',
    "import type { User } from '@/api/users-api'",
    "import { Ref } from 'vue'",
  ]) {
    assert.ok(inspectSource('types/users/user.ts', code).length)
  }
  assert.deepEqual(
    inspectSource(
      'types/users/user.ts',
      "import type { Ref } from 'vue'\nexport interface Draft { name: string; input: Ref<string> }",
    ),
    [],
  )
})
test('generic components reject business dependencies but permit interaction composables', () => {
  assert.ok(
    inspectSource(
      'components/form/Form.vue',
      '<script setup lang="ts" generic="T extends Record<string, unknown>">\nimport { usersApi } from "@/api/users-api"\n</script>',
    ).length,
  )
  assert.ok(
    inspectSource(
      'components/form/Form.vue',
      '<script setup lang="ts">\nimport type { User } from "@/types/users/user"\n</script>',
    ).length,
  )
  assert.deepEqual(
    inspectSource(
      'components/data-table/Table.vue',
      '<script setup lang="ts">\nimport { useDataTable } from "@/composables/use-data-table"\n</script>',
    ),
    [],
  )
})
test('business components permit composables but cannot bypass the API boundary', () => {
  assert.deepEqual(
    inspectSource(
      'components/assistant/Workspace.vue',
      '<script setup lang="ts">\nimport { useAssistant } from "@/composables/assistant/use-assistant"\n</script>',
    ),
    [],
  )
  assert.ok(
    inspectSource(
      'components/assistant/Workspace.vue',
      '<script setup lang="ts">\nimport { http } from "@/http/http-client"\n</script>',
    ).length,
  )
})
test('third-party declarations and test helpers keep conventional paths', () => {
  assert.deepEqual(
    inspectSource(
      'components/ui/button/Button.vue',
      '<script setup lang="ts">\ninterface Props { label: string }\n</script>',
    ),
    [],
  )
  assert.deepEqual(
    inspectSource('pages/users/tests/index.spec.ts', 'interface TestUser { id: string }'),
    [],
  )
})

// AI modified: new business names and additional script blocks receive the same restrictions.
test('generic ownership does not depend on the current business names', () => {
  assert.ok(
    inspectSource(
      'components/form/Form.vue',
      '<script setup lang="ts">import type { Order } from "@/types/orders/order"</script>',
    ).length,
  )
  assert.ok(
    inspectSource(
      'components/form/Form.vue',
      '<script setup lang="ts">import { useOrders } from "@/composables/orders/use-orders"</script>',
    ).length,
  )
  assert.ok(
    inspectSource(
      'components/form/Form.vue',
      '<script lang="ts">export default {}</script><script setup lang="ts">import { ordersApi } from "@/api/orders-api"</script>',
    ).length,
  )
  assert.ok(
    inspectSource('types/users/user.ts', 'import type { User } from "@/types/../api/users-api"')
      .length,
  )
  assert.throws(
    () =>
      inspectSource('components/form/Form.vue', '<template></template><script setup lang="ts">'),
    /Unclosed script tag/,
  )
})
