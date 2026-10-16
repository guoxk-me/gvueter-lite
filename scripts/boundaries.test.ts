// @vitest-environment node
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { expect, test } from 'vite-plus/test';

const cli = resolve('node_modules/dependency-cruiser/bin/dependency-cruiser.mjs');
const config = resolve('dependency-cruiser.config.mjs');

function checkFixture(files: Record<string, string>) {
  const fixture = mkdtempSync(join(tmpdir(), 'gvueter-boundaries-'));
  try {
    for (const [filename, contents] of Object.entries(files)) {
      const target = join(fixture, filename);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, contents);
    }
    writeFileSync(
      join(fixture, 'tsconfig.app.json'),
      JSON.stringify({ compilerOptions: { paths: { '@/*': ['./src/*'] } } }),
    );
    return spawnSync(process.execPath, [cli, '--config', config, '--output-type', 'err', 'src'], {
      cwd: fixture,
      encoding: 'utf8',
    });
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}

test('boundary CLI rejects alias, type-only, re-export, dynamic and SFC violations', () => {
  const check = checkFixture({
    'src/api/users/index.ts': 'export type { Props } from "@/components/ui/props";',
    'src/components/ui/props.ts': 'export interface Props { title: string }',
    'src/components/form/index.ts': 'export { users } from "../../api/users/requests";',
    'src/api/users/requests.ts': 'export const users = [];',
    'src/pages/system/roles/index.ts': 'export const privatePage = import("../users/private");',
    'src/pages/system/users/private.ts': 'export const secret = 1;',
    'src/components/table/Invalid.vue':
      '<script setup lang="ts">import type { User } from "@/pages/system/users/types"; defineProps<{ user: User }>();</script><template><p>Fixture</p></template>',
    'src/pages/system/users/types.ts': 'export interface User { id: string }',
  });
  expect(check.status, check.stderr).toBeGreaterThan(0);
  expect(check.stdout).toContain('api-only-transport-and-contracts');
  expect(check.stdout).toContain('shared-not-business');
  expect(check.stdout).toContain('page-private');
  expect(check.stdout).toContain('Invalid.vue');
  expect(check.stdout).not.toContain('no-unresolved');
}, 30_000);

test('boundary CLI accepts local page code, public UI and API transport contracts', () => {
  const check = checkFixture({
    'src/pages/system/users/index.ts':
      'export { title } from "./private"; export { users } from "@/api/users";',
    'src/pages/system/users/private.ts': 'export const title = "users";',
    'src/api/users/index.ts':
      'import type { User } from "@/types/user"; import { request } from "@/http/request"; export const users: User[] = request();',
    'src/types/user.ts': 'export interface User { id: string }',
    'src/http/request.ts': 'export const request = () => [];',
    'src/components/form/index.ts': 'export { button } from "@/components/ui/button";',
    'src/components/ui/button.ts': 'export const button = "button";',
  });
  expect(check.status, check.stdout + check.stderr).toBe(0);
}, 30_000);

test('the production dependency graph satisfies the same rules', () => {
  expect(() =>
    execFileSync(process.execPath, [cli, '--config', config, 'src'], { encoding: 'utf8' }),
  ).not.toThrow();
}, 30_000);

test('production cannot import example sources or the MSW virtual bootstrap', () => {
  const check = checkFixture({
    'src/main.ts': 'import "../examples/contacts/seed"; import "virtual:msw"; import "./missing";',
    'examples/contacts/seed.ts': 'export const contacts = [];',
  });
  expect(check.status).toBeGreaterThan(0);
  expect(check.stdout).toContain('production-not-examples-or-tests');
  expect(check.stdout).toContain('mock-virtual-entry-only');
  expect(check.stdout).toContain('no-unresolved');
});
