import { afterEach, expect, test, vi } from 'vite-plus/test';
import { mount, flushPromises } from '@vue/test-utils';
import { type Component, h, nextTick } from 'vue';
import { z } from 'zod';
import SchemaForm from './SchemaForm.vue';
import type { FieldContext, FormHandle } from './types';
import { ApiError } from '@/http/api-error';
const wrappers: ReturnType<typeof mount>[] = [];
afterEach(() => {
  wrappers.forEach((wrapper) => wrapper.unmount());
  wrappers.length = 0;
  document.body.innerHTML = '';
});
function form(props: Record<string, unknown>) {
  const wrapper = mount(SchemaForm as Component, { attachTo: document.body, props });
  wrappers.push(wrapper);
  return wrapper;
}
const fields = [
  { name: 'name', label: '姓名', control: 'input', rule: z.string().min(1, '必填') },
  { name: 'enabled', label: '启用', control: 'switch' },
] as const;
test('validation focuses editable errors and false survives submission', async () => {
  const save = vi.fn(async (values: unknown) => values);
  const wrapper = form({ initialValues: { name: '', enabled: false }, fields, submit: save });
  const handle = wrapper.vm as unknown as FormHandle;
  expect(await handle.submit()).toEqual({ status: 'validation-failed' });
  expect(save).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(wrapper.get('input').element);
  await wrapper.get('input').setValue('新姓名');
  expect((await handle.submit()).status).toBe('success');
  expect(save).toHaveBeenCalledWith({ name: '新姓名', enabled: false });
  expect(handle.isDirty).toBe(false);
});
test('conditional fields omit nested values while readonly values remain', async () => {
  const save = vi.fn(async (values: unknown) => values);
  const wrapper = form({
    initialValues: { name: 'old', enabled: false, profile: { hidden: '', locked: 'read' } },
    fields: [
      ...fields,
      {
        name: 'profile.hidden',
        label: '隐藏',
        control: 'input',
        hidden: true,
        rule: z.string().min(1),
      },
      {
        name: 'profile.locked',
        label: '只读',
        control: 'input',
        readonly: true,
        rule: z.string().min(10),
      },
    ],
    submit: save,
  });
  expect((await (wrapper.vm as unknown as FormHandle).submit()).status).toBe('success');
  expect(save).toHaveBeenCalledWith({ name: 'old', enabled: false, profile: { locked: 'read' } });
});
test('failed save retains draft and only clears the edited server field error', async () => {
  const wrapper = form({
    initialValues: { name: 'old', enabled: true },
    fields,
    submit: async () => {
      throw new ApiError({
        message: 'bad',
        kind: 'http',
        status: 422,
        code: 'INVALID',
        fieldErrors: {
          name: '名称冲突',
          enabled: '状态不允许',
        },
      });
    },
  });
  const handle = wrapper.vm as unknown as FormHandle;
  await wrapper.get('input').setValue('draft');
  await handle.submit();
  await nextTick();
  expect(wrapper.text()).toContain('名称冲突');
  expect(document.activeElement).toBe(wrapper.get('input').element);
  expect(wrapper.text()).toContain('状态不允许');
  await wrapper.get('input').setValue('different');
  expect(wrapper.text()).not.toContain('名称冲突');
  expect(wrapper.text()).toContain('状态不允许');
  expect(handle.isDirty).toBe(true);
});
test('submission locks input and rejects duplicates; reset requires confirmation', async () => {
  let finish!: (saved: string) => void;
  const save = vi.fn(
    () =>
      new Promise<string>((resolve) => {
        finish = resolve;
      }),
  );
  const wrapper = form({ initialValues: { name: 'old', enabled: true }, fields, submit: save });
  const handle = wrapper.vm as unknown as FormHandle;
  await wrapper.get('input').setValue('changed');
  const resetting = handle.reset();
  await flushPromises();
  const cancel = [...document.querySelectorAll('button')].find(
    (button) => button.textContent === '继续编辑',
  )!;
  cancel.click();
  expect(await resetting).toEqual({ status: 'cancelled' });
  expect(wrapper.get('input').element).toHaveProperty('value', 'changed');
  const saving = handle.submit();
  await flushPromises();
  expect(wrapper.get('input').attributes('disabled')).toBeDefined();
  expect(await handle.submit()).toEqual({ status: 'not-executed' });
  expect(await handle.reset()).toEqual({ status: 'blocked' });
  finish('done');
  await saving;
  expect(save).toHaveBeenCalledOnce();
});
test('accepted reset restores the snapshot; unknown outcome cannot be replayed in the same editor', async () => {
  const save = vi.fn(async () => {
    throw new ApiError({ message: '结果待确认', kind: 'unknown' });
  });
  const wrapper = form({ initialValues: { name: 'old', enabled: true }, fields, submit: save });
  const handle = wrapper.vm as unknown as FormHandle;
  await wrapper.get('input').setValue('changed');
  const resetting = handle.reset();
  await flushPromises();
  [...document.querySelectorAll('button')]
    .find((button) => button.textContent === '放弃修改')!
    .click();
  expect(await resetting).toEqual({ status: 'completed' });
  await flushPromises();
  expect(wrapper.get('input').element).toHaveProperty('value', 'old');
  expect((await handle.submit()).status).toBe('unknown');
  await handle.reset();
  expect((await handle.submit()).status).toBe('not-executed');
  expect(save).toHaveBeenCalledOnce();
});

test('explicit hidden and disabled submission overrides retain empty strings and false without coercion', async () => {
  const save = vi.fn(async (values: unknown) => values);
  const wrapper = form({
    initialValues: { name: '', enabled: false, other: 'mixed' },
    fields: [
      { name: 'name', label: '隐藏', control: 'input', hidden: true, submitWhenHidden: true },
      {
        name: 'enabled',
        label: '禁用',
        control: 'switch',
        disabled: true,
        submitWhenDisabled: true,
      },
      {
        name: 'other',
        label: '文本',
        control: 'input',
        rule: z.string().transform((text) => text.toUpperCase()),
      },
    ],
    submit: save,
  });
  await (wrapper.vm as unknown as FormHandle).submit();
  expect(save).toHaveBeenCalledWith({ name: '', enabled: false, other: 'mixed' });
});

test('field slots share focus and unfinished-input protection and take priority over render', async () => {
  const save = vi.fn(async (values: unknown) => values);
  const render = vi.fn(() => h('span', 'fallback'));
  let extension!: FieldContext<string>;
  const wrapper = mount(SchemaForm as Component, {
    attachTo: document.body,
    props: {
      initialValues: { name: 'initial' },
      fields: [{ name: 'name', label: 'Name', control: 'input', render }],
      submit: save,
    },
    slots: {
      'field-name': (scope: FieldContext<string>) => {
        extension = scope;
        return h('input', {
          id: scope.inputId,
          value: scope.value,
          disabled: scope.disabled,
          readonly: scope.readonly,
          'aria-describedby': scope.errorId,
          onBlur: scope.blur,
          onInput: (event: Event) => scope.update((event.target as HTMLInputElement).value),
          ref: (element: unknown) =>
            scope.registerFocus(element instanceof HTMLElement ? () => element.focus() : undefined),
        });
      },
    },
  });
  wrappers.push(wrapper);
  const handle = wrapper.vm as unknown as FormHandle;
  expect(render).not.toHaveBeenCalled();
  extension.setDraftPending(true);
  expect(handle.isDirty).toBe(true);
  expect(await handle.submit()).toEqual({ status: 'validation-failed' });
  expect(save).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(wrapper.get('input').element);
  extension.setDraftPending(false);
  await wrapper.get('input').setValue('');
  await handle.submit();
  expect(save).toHaveBeenCalledWith({ name: '' });
});
