<script
  setup
  lang="ts"
  generic="T extends object, F extends readonly FormField<T>[], C extends EditorContext, R"
>
import { computed, readonly, onBeforeUnmount, shallowRef, watch, useTemplateRef } from 'vue';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { copySnapshot } from '@/composables/state-snapshot';
import DiscardDialog from '@/components/modal/DiscardDialog.vue';
import SchemaForm from './SchemaForm.vue';
import type {
  FormSlots,
  EditorContext,
  FormField,
  FormHandle,
  SubmitValues,
  SubmitOutcome,
  GuardOutcome,
  FieldPath,
} from './types';

const props = withDefaults(
  defineProps<{
    open: boolean;
    context: C;
    fields: F;
    title?: string;
    blocked?: boolean;
    load: (context: C) => T | Promise<T>;
    submit: (values: SubmitValues<T, F>, context: C) => R | Promise<R>;
  }>(),
  { title: '编辑', blocked: false },
);
const slots = defineSlots<FormSlots<T, R>>();
const fieldSlotNames = computed(() => Object.keys(slots) as (keyof FormSlots<T, R> & string)[]);
const emit = defineEmits<{
  'update:open': [open: boolean];
  saved: [event: { context: C; saved: R }];
}>();
const isOpen = shallowRef(false);
const isLoading = shallowRef(false);
const initialValues = shallowRef<T>();
const openedContext = shallowRef<C>();
const loadError = shallowRef('');
const epoch = shallowRef(0);
const sessionKey = shallowRef(0);
const formRef = shallowRef<FormHandle<R> | null>(null);
const confirmation = useTemplateRef('confirmation');
const isReady = computed(
  () => isOpen.value && !isLoading.value && initialValues.value !== undefined,
);
const isSubmitting = computed(() => formRef.value?.isSubmitting ?? false);
const isDirty = computed(() => formRef.value?.isDirty ?? false);
let alive = true;
let opener: HTMLElement | null = null;
async function initialize() {
  const current = ++epoch.value;
  sessionKey.value++;
  isLoading.value = true;
  loadError.value = '';
  initialValues.value = undefined;
  try {
    const loaded = await props.load(copySnapshot(openedContext.value as C));
    if (!alive || current !== epoch.value || !isOpen.value) return;
    initialValues.value = copySnapshot(loaded);
  } catch (error) {
    if (alive && current === epoch.value)
      loadError.value = error instanceof Error ? error.message : '加载失败';
  } finally {
    if (alive && current === epoch.value) isLoading.value = false;
  }
}
function closeSaved() {
  isOpen.value = false;
  epoch.value++;
  emit('update:open', false);
}
async function requestClose(): Promise<GuardOutcome> {
  if (!alive || isSubmitting.value) return { status: 'blocked' };
  if (!isOpen.value) return { status: 'completed' };
  const current = epoch.value;
  if (isDirty.value && !(await confirmation.value?.ask())) return { status: 'cancelled' };
  if (!alive || current !== epoch.value || isSubmitting.value) return { status: 'blocked' };
  closeSaved();
  return { status: 'completed' };
}
async function save(values: SubmitValues<T, F>): Promise<R> {
  return props.submit(values, copySnapshot(openedContext.value as C));
}
function saved(record: R) {
  const context = copySnapshot(openedContext.value as C);
  closeSaved();
  // AI modified: successful teardown cannot be prevented by a failing resource notification.
  emit('saved', { context, saved: record });
}
function afterClose(event: Event) {
  if (isOpen.value) return;
  initialValues.value = undefined;
  formRef.value = null;
  event.preventDefault();
  if (opener?.isConnected) opener.focus();
}
watch(
  () => props.open,
  async (open) => {
    if (open && !isOpen.value) {
      opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      openedContext.value = copySnapshot(props.context);
      isOpen.value = true;
      await initialize();
    } else if (!open && isOpen.value) {
      const closed = await requestClose();
      if (closed.status !== 'completed' && alive) emit('update:open', true);
    }
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  alive = false;
  epoch.value++;
});
const submit = (): Promise<SubmitOutcome<R>> =>
  isReady.value && formRef.value
    ? formRef.value.submit()
    : Promise.resolve({ status: 'not-executed' });
const validate = () =>
  isReady.value && formRef.value ? formRef.value.validate() : Promise.resolve(false);
const reset = (): Promise<GuardOutcome> =>
  isReady.value && formRef.value ? formRef.value.reset() : Promise.resolve({ status: 'blocked' });
const focusField = (name: FieldPath<T>) =>
  isReady.value ? (formRef.value?.focusField(name) ?? false) : false;
defineExpose({
  submit,
  validate,
  reset,
  focusField,
  requestClose,
  isDirty,
  isSubmitting,
  isLoading: readonly(isLoading),
  isReady,
});
</script>
<template>
  <Dialog
    :open="isOpen"
    @update:open="
      (open) => {
        if (!open) requestClose();
      }
    "
  >
    <DialogContent
      class="sm:max-w-lg"
      :show-close-button="!isSubmitting"
      @close-auto-focus="afterClose"
    >
      <DialogHeader
        ><DialogTitle>{{ title }}</DialogTitle
        ><DialogDescription
          >填写资料后保存；未保存的修改会在关闭时提示。</DialogDescription
        ></DialogHeader
      >
      <p v-if="isLoading" role="status">正在读取…</p>
      <div v-else-if="loadError" class="flex flex-col gap-3">
        <p role="alert">{{ loadError }}</p>
        <Button variant="outline" @click="initialize">重试读取</Button>
      </div>
      <SchemaForm
        v-else-if="initialValues"
        :key="sessionKey"
        :ref="(instance: unknown) => (formRef = instance as FormHandle<R> | null)"
        :initial-values="initialValues"
        :fields="fields"
        :submit="save"
        :active="isOpen"
        :blocked="blocked"
        @saved="saved"
      >
        <template v-for="name in fieldSlotNames" #[name]="scope"
          ><slot :name="name" v-bind="scope"
        /></template>
      </SchemaForm>
      <p v-if="blocked" role="status" class="text-muted-foreground text-sm">
        相关操作结果待确认，请在列表上方核实后再保存。
      </p>
      <Button type="button" variant="ghost" :disabled="isSubmitting" @click="requestClose"
        >取消</Button
      >
    </DialogContent>
  </Dialog>
  <DiscardDialog ref="confirmation" />
</template>
