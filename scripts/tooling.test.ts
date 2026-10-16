// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { compileTemplate } from 'vue/compiler-sfc';
import { expect, test } from 'vite-plus/test';

// AI modified: isolated failing examples prove the configured checks actually reject errors.
test('vue-tsc rejects script and template type errors', () => {
  const fixture = mkdtempSync(resolve('node_modules/.type-check-'));
  try {
    writeFileSync(join(fixture, 'invalid.ts'), 'export const count: number = "invalid";');
    writeFileSync(
      join(fixture, 'Invalid.vue'),
      '<script setup lang="ts">const count = 1;</script><template>{{ count.toUpperCase() }}</template>',
    );
    writeFileSync(
      join(fixture, 'Child.vue'),
      '<script setup lang="ts">defineProps<{ count: number }>();</script><template>{{ count }}</template>',
    );
    writeFileSync(
      join(fixture, 'InvalidProp.vue'),
      '<script setup lang="ts">import Child from "./Child.vue";</script><template><Child count="wrong" /></template>',
    );
    writeFileSync(
      join(fixture, 'tsconfig.json'),
      JSON.stringify({
        extends: resolve('tsconfig.app.json'),
        compilerOptions: { incremental: false, tsBuildInfoFile: undefined },
        include: ['./invalid.ts', './*.vue'],
      }),
    );
    const check = spawnSync(
      process.execPath,
      [
        resolve('node_modules/vue-tsc/bin/vue-tsc.js'),
        '--noEmit',
        '-p',
        join(fixture, 'tsconfig.json'),
      ],
      { encoding: 'utf8' },
    );
    expect(check.status).not.toBe(0);
    expect(check.stdout + check.stderr).toContain('TS2322');
    expect(check.stdout + check.stderr).toContain('TS2339');
    expect(check.stdout + check.stderr).toContain('InvalidProp.vue');
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}, 30_000);

test('Vue compiler rejects malformed templates', () => {
  const compilation = compileTemplate({
    source: '<div><span></div>',
    filename: 'Invalid.vue',
    id: 'invalid-fixture',
  });
  expect(compilation.errors.length).toBeGreaterThan(0);
});

test('Oxlint rejects a debugger statement in normal TypeScript', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'gvueter-lint-'));
  try {
    const filename = join(fixture, 'invalid.ts');
    writeFileSync(filename, 'debugger;\n');
    const check = spawnSync(resolve('node_modules/.bin/vp'), ['lint', filename], {
      encoding: 'utf8',
    });
    expect(check.status).toBeGreaterThan(0);
    expect(check.stdout + check.stderr).toContain('no-debugger');
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}, 30_000);

test('public generic components infer Vue slot values and reject invalid contexts and row types', () => {
  const fixture = mkdtempSync(resolve('node_modules/.component-contract-'));
  const source = `<script setup lang="ts">
import { SchemaForm, FormDialog, type FormField } from '@/components/form';
import { DataTable, type DataTableColumn } from '@/components/table';
type Values = { name: string; enabled: boolean };
type Context = { mode: 'create' } | { mode: 'edit'; id: string };
const fields = [{ name: 'name', label: 'Name', control: 'input' }, { name: 'enabled', label: 'Enabled', control: 'switch' }] as const satisfies readonly FormField<Values>[];
const initialValues: Values = { name: '', enabled: false };
const load = (_context: Context) => initialValues;
const save = async (values: Values, _context: Context) => values;
const columns: readonly DataTableColumn<Values>[] = [{ id: 'name', title: 'Name', field: 'name' }];
const query = () => ({ queryKey: ['rows'], queryFn: async () => ({ records: [initialValues], total: 1 }) });
</script>`;
  try {
    writeFileSync(
      join(fixture, 'Valid.vue'),
      `${source}<template>
<SchemaForm :initial-values="initialValues" :fields="fields"><template #field-name="scope">{{ scope.value.toUpperCase() }}<button @click="scope.update('ok')">Update</button></template></SchemaForm>
<FormDialog :open="false" :context="{ mode: 'edit', id: '1' }" :load="load" :submit="save" :fields="fields" />
<DataTable table-id="test" :query="query" :columns="columns"><template #cell-name="{ row }">{{ row.name.toUpperCase() }}</template></DataTable>
</template>`,
    );
    const config = {
      extends: resolve('tsconfig.app.json'),
      compilerOptions: { incremental: false, tsBuildInfoFile: undefined },
      include: ['./*.vue'],
    };
    writeFileSync(join(fixture, 'tsconfig.json'), JSON.stringify(config));
    const check = () =>
      spawnSync(
        process.execPath,
        [
          resolve('node_modules/vue-tsc/bin/vue-tsc.js'),
          '--noEmit',
          '-p',
          join(fixture, 'tsconfig.json'),
        ],
        { encoding: 'utf8' },
      );
    const valid = check();
    expect(valid.stdout + valid.stderr).toBe('');
    expect(valid.status).toBe(0);
    writeFileSync(
      join(fixture, 'Invalid.vue'),
      `${source}<template>
<SchemaForm :initial-values="initialValues" :fields="fields"><template #field-name="scope"><button @click="scope.update(false)">{{ scope.value.toFixed() }}</button></template></SchemaForm>
<FormDialog :open="false" :context="{ mode: 'edit' }" :load="load" :submit="save" :fields="fields" />
<DataTable table-id="test" :query="query" :columns="columns"><template #cell-name="{ row }">{{ row.absent }}</template></DataTable>
</template>`,
    );
    const invalid = check();
    const diagnostics = invalid.stdout + invalid.stderr;
    expect(invalid.status).not.toBe(0);
    expect(diagnostics).not.toContain('Valid.vue');
    expect(diagnostics).toContain('toFixed');
    expect(diagnostics).toContain('boolean');
    expect(diagnostics).toContain('id');
    expect(diagnostics).toContain('absent');
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}, 30_000);

test('all direct dependencies use the default catalog', () => {
  const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };
  const workspace = readFileSync('pnpm-workspace.yaml', 'utf8');
  const catalog = workspace.split('\ncatalog:\n')[1]?.split(/\n(?=\S)/)[0] ?? '';
  expect(workspace).toContain('catalogMode: strict');
  for (const [name, version] of Object.entries({
    ...manifest.dependencies,
    ...manifest.devDependencies,
  })) {
    expect(version, name).toBe('catalog:');
    expect(catalog, name).toContain(`'${name}':`);
  }
});
