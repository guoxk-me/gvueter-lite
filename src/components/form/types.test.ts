import { expectTypeOf, test } from 'vite-plus/test';
import { z } from 'zod';
import type { FormField, SubmitValues } from './types';
import type { DataTableColumn, TableQuery } from '../table/types';
interface Profile {
  name: string;
  enabled: boolean;
  details: { email: string; label: string };
}
const fields = [
  { name: 'name', label: '姓名', control: 'input', rule: z.string() },
  { name: 'enabled', label: '启用', control: 'switch' },
  {
    name: 'details.email',
    label: '邮箱',
    control: 'input',
    hidden: (profile: Profile) => !profile.enabled,
  },
  { name: 'details.label', label: '标签', control: 'input' },
] as const satisfies readonly FormField<Profile>[];

test('conditional submission preserves required siblings and nested path types', () => {
  type Submitted = SubmitValues<Profile, typeof fields>;
  expectTypeOf<Submitted['name']>().toEqualTypeOf<string>();
  expectTypeOf<Submitted['enabled']>().toEqualTypeOf<boolean>();
  expectTypeOf<Submitted['details']['email']>().toEqualTypeOf<string | undefined>();
  expectTypeOf<Submitted['details']['label']>().toEqualTypeOf<string>();
});
// AI modified: these negative samples are compiled by vue-tsc, not just transpiled by the test runner.
function rejectedContracts() {
  // @ts-expect-error a field must exist
  const wrongPath: FormField<Profile> = { name: 'missing', label: '', control: 'input' };
  // @ts-expect-error boolean values cannot use a text control
  const wrongControl: FormField<Profile> = { name: 'enabled', label: '', control: 'input' };
  // @ts-expect-error the validator must accept the field type
  const wrongRule: FormField<Profile> = {
    name: 'name',
    label: '',
    control: 'input',
    rule: z.boolean(),
  };
  const wrongProps: FormField<Profile> = {
    name: 'name',
    label: '',
    control: 'input',
    // @ts-expect-error protected props cannot replace controlled updates
    props: { modelValue: 'x' },
  };
  const column: DataTableColumn<Profile> = {
    id: 'name',
    title: '',
    render: ({ row }) => {
      // @ts-expect-error rows preserve their resource type
      return row.absent;
    },
  };
  // @ts-expect-error query result must carry records and total
  const wrongQuery: TableQuery<Profile> = { queryKey: [], queryFn: async () => ({ rows: [] }) };
  return [wrongPath, wrongControl, wrongRule, wrongProps, column, wrongQuery];
}
void rejectedContracts;

test('constant visible fields and explicit submission overrides remain required', () => {
  const exactFields = [
    { name: 'name', label: '', control: 'input', hidden: false },
    { name: 'enabled', label: '', control: 'switch', disabled: true, submitWhenDisabled: true },
    { name: 'details.email', label: '', control: 'input', hidden: true, submitWhenHidden: true },
  ] as const satisfies readonly FormField<Profile>[];
  type Submitted = SubmitValues<Profile, typeof exactFields>;
  expectTypeOf<Submitted['name']>().toEqualTypeOf<string>();
  expectTypeOf<Submitted['enabled']>().toEqualTypeOf<boolean>();
  expectTypeOf<Submitted['details']['email']>().toEqualTypeOf<string>();
});
