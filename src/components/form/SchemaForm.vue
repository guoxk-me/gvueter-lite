<script setup lang="ts" generic="T extends object, F extends readonly FormField<T>[], R = unknown">
import {
  computed,
  nextTick,
  toRaw,
  onBeforeUnmount,
  shallowRef,
  readonly,
  useSlots,
  useId,
  useTemplateRef,
  watch,
  type VNodeChild,
} from 'vue';
import { useForm } from '@tanstack/vue-form';
import { ApiError } from '@/http/api-error';
import { copySnapshot, snapshotKey } from '@/composables/state-snapshot';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field';
import DiscardDialog from '@/components/modal/DiscardDialog.vue';
import { readField, omitField } from './field-path';
import type {
  FormSlots,
  FormField,
  FieldState,
  FieldContext,
  SubmitValues,
  SubmitOutcome,
  GuardOutcome,
  FieldPath,
} from './types';

const props = withDefaults(
  defineProps<{
    initialValues: T;
    fields: F;
    submit?: (values: SubmitValues<T, F>) => R | Promise<R>;
    active?: boolean;
    blocked?: boolean;
    protectReset?: boolean;
    submitLabel?: string;
  }>(),
  { active: true, blocked: false, protectReset: true, submitLabel: '保存' },
);
const emit = defineEmits<{ saved: [saved: R] }>();
defineSlots<FormSlots<T, R>>();
const slots = useSlots();
const initial = copySnapshot(props.initialValues);
const baseline = shallowRef(snapshotKey(initial));
const errors = shallowRef<Record<string, string[]>>({});
const serverErrors = shallowRef<Record<string, string>>({});
const touched = shallowRef<ReadonlySet<string>>(new Set());
const drafts = shallowRef<ReadonlySet<string>>(new Set());
const message = shallowRef('');
const isSubmitting = shallowRef(false);
// AI modified: a verified unknown write must not allow the same editor to replay its submission.
const hasUnknownOutcome = shallowRef(false);
const confirmation = useTemplateRef('confirmation');
const focusHandlers = new Map<string, () => void>();
const formId = useId();
let alive = true;
let revision = 0;
let outcome: SubmitOutcome<R> = { status: 'not-executed' };
// AI modified: TanStack owns the only business-value tree; presentation errors never mirror values.
const form = useForm({
  defaultValues: initial as Record<string, unknown>,
  onSubmit: async () => {
    if (!props.submit) {
      outcome = { status: 'not-executed' };
      return;
    }
    const snapshot = copySnapshot(values.value);
    for (const field of props.fields) {
      if (
        (state(field.hidden) && !field.submitWhenHidden) ||
        (state(field.disabled) && !field.submitWhenDisabled)
      )
        omitField(snapshot, field.name);
    }
    const saved = await props.submit(snapshot as SubmitValues<T, F>);
    outcome = { status: 'success', saved };
  },
});
const engineValues = form.useSelector((state) => state.values);
const values = computed(() => engineValues.value as T);
const isDirty = computed(
  () => drafts.value.size > 0 || snapshotKey(values.value) !== baseline.value,
);
function state(condition?: FieldState<T>): boolean {
  return typeof condition === 'function' ? condition(values.value) : Boolean(condition);
}
function canEdit(field: FormField<T>) {
  return (
    props.active &&
    !isSubmitting.value &&
    !state(field.hidden) &&
    !state(field.disabled) &&
    !state(field.readonly)
  );
}
function participates(field: FormField<T>) {
  return !state(field.hidden) && !state(field.disabled) && !state(field.readonly);
}
async function checkField(field: FormField<T>) {
  if (!participates(field)) {
    errors.value = { ...errors.value, [field.name]: [] };
    return;
  }
  const before = revision;
  // AI modified: schemas supplied inside reactive field configs retain non-proxy Zod internals.
  const issues = field.rule
    ? (await toRaw(field.rule)['~standard'].validate(readField(values.value, field.name))).issues
    : undefined;
  if (!alive || before !== revision) return;
  errors.value = { ...errors.value, [field.name]: issues?.map((issue) => issue.message) ?? [] };
}
async function validate() {
  if (!alive || !props.active) return false;
  await Promise.all(props.fields.map(checkField));
  return (
    Object.values(errors.value).every((messages) => !messages.length) &&
    !props.fields.some((field) => participates(field) && drafts.value.has(field.name))
  );
}
function focusField(name: FieldPath<T>): boolean {
  const field = props.fields.find((entry) => entry.name === name);
  if (!field || !canEdit(field)) return false;
  const focus = focusHandlers.get(name);
  if (!focus) return false;
  focus();
  return true;
}
async function submit(): Promise<SubmitOutcome<R>> {
  if (!alive || !props.active || props.blocked || hasUnknownOutcome.value || isSubmitting.value)
    return { status: 'not-executed' };
  isSubmitting.value = true;
  message.value = '';
  outcome = { status: 'not-executed' };
  const run = revision;
  try {
    const valid = await validate();
    if (!alive || !props.active || run !== revision) return { status: 'not-executed' };
    if (!valid) {
      // Temporarily release the interaction lock so error focus uses the ordinary editable predicate.
      isSubmitting.value = false;
      await nextTick();
      const first = props.fields.find(
        (field) =>
          participates(field) && (errors.value[field.name]?.length || drafts.value.has(field.name)),
      );
      if (!first || !focusField(first.name)) message.value = '请检查表单中的错误。';
      return { status: 'validation-failed' };
    }
    await form.handleSubmit();
    if (!alive || !props.active || run !== revision) return { status: 'not-executed' };
    // The engine invokes onSubmit indirectly; TypeScript cannot track that callback assignment.
    const submitted = outcome as SubmitOutcome<R>;
    if (submitted.status === 'success') {
      baseline.value = snapshotKey(values.value);
      drafts.value = new Set();
      // Success cleanup is independent from consumers' notification callbacks.
      try {
        emit('saved', submitted.saved);
      } catch {
        message.value = '保存已成功。';
      }
    }
    return submitted;
  } catch (error) {
    if (!alive || run !== revision) return { status: 'not-executed' };
    const failure =
      error instanceof ApiError
        ? error
        : new ApiError({ message: '保存失败，请重试。', kind: 'contract' });
    const fieldErrors: Record<string, string> = {};
    const unlocated: string[] = [];
    for (const [name, text] of Object.entries(failure.fieldErrors)) {
      if (props.fields.some((field) => field.name === name && participates(field)))
        fieldErrors[name] = text;
      else unlocated.push(text);
    }
    if (failure.kind === 'unknown') hasUnknownOutcome.value = true;
    serverErrors.value = fieldErrors;
    message.value = unlocated.length
      ? unlocated.join('；')
      : Object.keys(fieldErrors).length
        ? ''
        : failure.message;
    const first = props.fields.find((field) => fieldErrors[field.name] && participates(field));
    if (first) {
      // AI modified: server field failures use the same editable-focus policy as local validation.
      isSubmitting.value = false;
      await nextTick();
      if (alive && props.active && run === revision) focusField(first.name);
    }
    return {
      status:
        failure.kind === 'unknown'
          ? 'unknown'
          : failure.kind === 'not-executed'
            ? 'not-executed'
            : 'failed',
    };
  } finally {
    if (alive) isSubmitting.value = false;
  }
}
async function reset(): Promise<GuardOutcome> {
  if (!alive || !props.active || isSubmitting.value) return { status: 'blocked' };
  if (props.protectReset && isDirty.value && !(await confirmation.value?.ask()))
    return { status: 'cancelled' };
  if (!alive || !props.active || isSubmitting.value) return { status: 'blocked' };
  revision++;
  form.reset(copySnapshot(initial) as Record<string, unknown>);
  baseline.value = snapshotKey(initial);
  errors.value = {};
  serverErrors.value = {};
  drafts.value = new Set();
  touched.value = new Set();
  message.value = hasUnknownOutcome.value
    ? '本次保存曾出现未知结果，请关闭窗口并核实后重新打开。'
    : '';
  return { status: 'completed' };
}
function fieldContext(field: FormField<T>): FieldContext<string | boolean> {
  const current = readField(values.value, field.name);
  if (typeof current !== (field.control === 'input' ? 'string' : 'boolean'))
    throw new Error(`字段 ${field.name} 缺失或类型不匹配`);
  const inputId = `${formId}-${field.name}`;
  return {
    value: current as string | boolean,
    update(next) {
      if (!canEdit(field) || typeof next !== typeof current) return;
      revision++;
      form.setFieldValue(String(field.name), next);
      const remaining = { ...serverErrors.value };
      delete remaining[field.name];
      serverErrors.value = remaining;
      if (errors.value[field.name]?.length || touched.value.has(field.name)) void checkField(field);
    },
    blur() {
      touched.value = new Set([...touched.value, field.name]);
      void checkField(field);
    },
    disabled: state(field.disabled) || isSubmitting.value || !props.active,
    readonly: state(field.readonly),
    isSubmitting: isSubmitting.value,
    inputId,
    descriptionId: `${inputId}-description`,
    errorId: `${inputId}-error`,
    errors: [
      ...(errors.value[field.name] ?? []),
      ...(serverErrors.value[field.name] ? [serverErrors.value[field.name]!] : []),
    ],
    registerFocus(focus) {
      if (focus) focusHandlers.set(field.name, focus);
      else focusHandlers.delete(field.name);
    },
    setDraftPending(pending) {
      if (!canEdit(field)) return;
      const next = new Set(drafts.value);
      if (pending) next.add(field.name);
      else next.delete(field.name);
      drafts.value = next;
    },
  };
}
const rows = computed(() =>
  props.fields
    .filter((field) => !state(field.hidden))
    .map((field) => ({ field, context: fieldContext(field) })),
);
const RenderField = (props: { content: () => VNodeChild }) => props.content();
function renderField(field: FormField<T>, context: FieldContext<string | boolean>) {
  // Type erasure is local to rendering; the public mapped union checks each callback against its path.
  return (field.render as ((context: FieldContext<string | boolean>) => VNodeChild) | undefined)?.(
    context,
  );
}
function registerElement(name: string, element: unknown) {
  const node = element && typeof element === 'object' && '$el' in element ? element.$el : element;
  if (node instanceof HTMLElement)
    focusHandlers.set(name, () => {
      node.scrollIntoView?.({ block: 'nearest' });
      node.focus();
    });
  else focusHandlers.delete(name);
}
watch(
  () => props.fields.map((field) => [field.name, participates(field)]),
  () => {
    for (const field of props.fields)
      if (!participates(field)) {
        errors.value = { ...errors.value, [field.name]: [] };
        const remaining = { ...serverErrors.value };
        delete remaining[field.name];
        serverErrors.value = remaining;
      }
  },
);
watch(
  () => props.active,
  () => {
    revision++;
  },
);
onBeforeUnmount(() => {
  alive = false;
  revision++;
});
defineExpose({
  validate,
  submit,
  reset,
  focusField,
  isDirty,
  isSubmitting: readonly(isSubmitting),
});
</script>
<template>
  <form novalidate @submit.prevent="submit">
    <FieldGroup>
      <Field
        v-for="{ field, context } in rows"
        :key="field.name"
        :data-invalid="context.errors.length ? true : undefined"
        :data-disabled="context.disabled ? true : undefined"
      >
        <FieldLabel :for="context.inputId">{{ field.label }}</FieldLabel>
        <slot v-if="slots[`field-${field.name}`]" :name="`field-${field.name}`" v-bind="context" />
        <RenderField v-else-if="field.render" :content="() => renderField(field, context)" />
        <Input
          v-else-if="field.control === 'input'"
          v-bind="field.props"
          :id="context.inputId"
          :ref="(el) => registerElement(field.name, el)"
          :model-value="String(context.value)"
          :disabled="context.disabled"
          :readonly="context.readonly"
          :aria-invalid="Boolean(context.errors.length)"
          :aria-describedby="`${context.descriptionId} ${context.errorId}`"
          @update:model-value="(next) => context.update(String(next))"
          @blur="context.blur"
        />
        <Switch
          v-else
          v-bind="field.props"
          :id="context.inputId"
          :ref="(el) => registerElement(field.name, el)"
          :model-value="context.value === true"
          :disabled="context.disabled || context.readonly"
          :aria-readonly="context.readonly"
          :aria-invalid="Boolean(context.errors.length)"
          :aria-describedby="`${context.descriptionId} ${context.errorId}`"
          @update:model-value="context.update"
          @blur="context.blur"
        />
        <FieldDescription :id="context.descriptionId">{{ field.description }}</FieldDescription>
        <p
          v-if="context.errors.length"
          :id="context.errorId"
          class="text-sm text-destructive"
          role="alert"
        >
          {{ context.errors.join('；') }}
        </p>
      </Field>
      <p v-if="message" role="alert" class="text-sm text-destructive">{{ message }}</p>
      <slot
        name="actions"
        :submit="submit"
        :reset="reset"
        :is-submitting="isSubmitting"
        :is-dirty="isDirty"
      >
        <div class="flex justify-end gap-2">
          <Button type="button" variant="outline" :disabled="isSubmitting || !active" @click="reset"
            >重置</Button
          ><Button
            type="submit"
            :disabled="isSubmitting || !active || blocked || hasUnknownOutcome"
            >{{ isSubmitting ? '保存中…' : submitLabel }}</Button
          >
        </div>
      </slot>
    </FieldGroup>
    <DiscardDialog ref="confirmation" />
  </form>
</template>
