<script setup lang="ts">
import { computed, h, onMounted, onBeforeUnmount, shallowRef } from 'vue';
import { z } from 'zod';
import { toast, Toaster } from 'vue-sonner';
import { DataTable, type DataTableColumn, type TableRequest } from '@/components/table';
import { FormDialog, type FormField } from '@/components/form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { useQueryRuntime } from '@/query/runtime';
import { useResourceMutation } from '@/query/use-resource-mutation';
import {
  contactKeys,
  contactListQuery,
  loadContact,
  saveContact,
  verifyContact,
  resetExample,
  setScenario,
  readScenario,
} from './api';
import {
  contactFormSchema,
  scenarioSchema,
  type Contact,
  type ContactContext,
  type ContactFormValues,
  type ContactSearch,
} from './contracts';

const runtime = useQueryRuntime();
const isEditorOpen = shallowRef(false);
const editingContext = shallowRef<ContactContext>({ mode: 'create' });
const scenario = shallowRef('normal');
const isResetting = shallowRef(false);
const identity = computed(() => runtime.identity.value?.context ?? '');
const contactFields = [
  {
    name: 'name',
    label: '姓名',
    control: 'input',
    rule: contactFormSchema.shape.name,
    props: { autocomplete: 'name' },
  },
  {
    name: 'email',
    label: '邮箱',
    control: 'input',
    rule: contactFormSchema.shape.email,
    props: { type: 'email', autocomplete: 'email' },
  },
  { name: 'enabled', label: '启用', control: 'switch', rule: z.boolean() },
] as const satisfies readonly FormField<ContactFormValues>[];
const searchFields = [
  { name: 'keyword', label: '搜索姓名或邮箱', control: 'input' },
  { name: 'enabledOnly', label: '仅显示启用联系人', control: 'switch' },
] as const satisfies readonly FormField<ContactSearch>[];
const searchDefaults: ContactSearch = { keyword: '', enabledOnly: false };
const columns: readonly DataTableColumn<Contact>[] = [
  { id: 'name', title: '姓名', field: 'name', sortField: 'name' },
  {
    id: 'email',
    title: '邮箱',
    field: 'email',
    sortField: 'email',
    render: ({ row }) =>
      h('a', { href: `mailto:${row.email}`, class: 'underline underline-offset-4' }, row.email),
  },
  { id: 'enabled', title: '状态', field: 'enabled' },
  { id: 'actions', title: '操作' },
];
function scope(context: ContactContext) {
  return {
    resource: 'contacts',
    action: context.mode,
    target: context.mode === 'create' ? 'create' : context.id,
  };
}
const mutation = useResourceMutation({
  resource: 'contacts',
  scope: (input: { values: ContactFormValues; context: ContactContext }) => scope(input.context),
  write: saveContact,
  verify: (operation) => verifyContact(operation.operationId),
  onUncertain(operation) {
    // AI modified: potentially committed writes make cached details stale, even before verification.
    void runtime.client.invalidateQueries({
      queryKey: contactKeys.lists(identity.value),
      refetchType: 'none',
    });
    if (operation.target !== 'create')
      void runtime.client.invalidateQueries({
        queryKey: contactKeys.detail(identity.value, operation.target),
        refetchType: 'none',
      });
  },
  onConfirmed(contact) {
    runtime.client.setQueryData(contactKeys.detail(identity.value, contact.id), contact);
    // AI modified: list refresh is independent of the completed write and cannot keep the editor pending.
    void runtime.client.invalidateQueries({ queryKey: contactKeys.lists(identity.value) });
  },
});
const blocked = computed(() => mutation.isBlocked(scope(editingContext.value)));
const listQuery = (request: TableRequest<ContactSearch, undefined>) =>
  contactListQuery(identity.value, request);
const loadForm = (context: ContactContext) => loadContact(runtime.client, identity.value, context);
const saveForm = (values: ContactFormValues, context: ContactContext) =>
  mutation.mutateAsync({ values, context });
function openEditor(context: ContactContext) {
  editingContext.value = context;
  isEditorOpen.value = true;
}
async function changeScenario(next: unknown) {
  const chosen = scenarioSchema.safeParse(next);
  if (!chosen.success) return;
  try {
    await setScenario(chosen.data);
    scenario.value = chosen.data;
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '场景切换失败');
  }
}
async function reset() {
  if (isResetting.value || isEditorOpen.value || mutation.isPending.value) return;
  isResetting.value = true;
  try {
    await resetExample();
    runtime.operations.clear();
    scenario.value = 'normal';
    runtime.client.clear();
    toast.success('示例已重置');
    location.reload();
  } catch {
    toast.error('重置失败');
  } finally {
    isResetting.value = false;
  }
}
onMounted(async () => {
  try {
    scenario.value = await readScenario();
  } catch {
    toast.error('无法读取模拟场景，请重试刷新。');
  }
});
onBeforeUnmount(mutation.dispose);
</script>
<template>
  <main class="mx-auto flex max-w-6xl flex-col gap-8 px-8 py-10">
    <header class="flex items-start justify-between gap-6">
      <div class="flex flex-col gap-2">
        <p class="text-sm text-muted-foreground">GVUETER LITE · 开发示例</p>
        <h1 class="text-3xl font-semibold tracking-tight">联系人</h1>
        <p class="text-muted-foreground">验证表单、表格与请求协作。数据仅保存在本机示例环境。</p>
      </div>
      <Button
        variant="outline"
        :disabled="isEditorOpen || mutation.isPending.value || isResetting"
        @click="reset"
        >重置示例</Button
      >
    </header>
    <details class="rounded-lg border p-4">
      <summary class="cursor-pointer">模拟场景</summary>
      <div class="mt-3 flex items-center gap-3">
        <label for="scenario">响应行为</label
        ><NativeSelect id="scenario" :model-value="scenario" @update:model-value="changeScenario"
          ><NativeSelectOption value="normal">正常</NativeSelectOption
          ><NativeSelectOption value="read-failure">列表读取失败</NativeSelectOption
          ><NativeSelectOption value="save-rejected">保存明确失败</NativeSelectOption
          ><NativeSelectOption value="refresh-failure">保存成功，刷新失败</NativeSelectOption
          ><NativeSelectOption value="unknown">写入成功，响应丢失</NativeSelectOption
          ><NativeSelectOption value="unknown-pending">响应丢失，暂不能核实</NativeSelectOption
          ><NativeSelectOption value="slow-save"
            >写入成功，延迟响应</NativeSelectOption
          ></NativeSelect
        >
      </div>
    </details>
    <Alert v-for="operation in mutation.unresolved.value" :key="operation.operationId">
      <AlertTitle>{{
        operation.status === 'pending' ? '操作进行中' : '操作结果待确认'
      }}</AlertTitle>
      <AlertDescription
        ><div class="flex items-center justify-between gap-4">
          <p>
            {{
              operation.target === 'create' ? '新增联系人' : `联系人 ${operation.target}`
            }}：相关写入暂不可重复执行。
          </p>
          <Button
            variant="outline"
            :disabled="
              operation.status === 'pending' || mutation.checking.value.has(operation.operationId)
            "
            @click="mutation.verifyOperation(operation.operationId)"
            >核实结果</Button
          >
        </div></AlertDescription
      >
    </Alert>
    <DataTable
      table-id="example-contacts"
      :query="listQuery"
      :columns="columns"
      :search-fields="searchFields"
      :search-defaults="searchDefaults"
      selectable
    >
      <template #toolbar
        ><Button @click="openEditor({ mode: 'create' })">新增联系人</Button></template
      >
      <template #cell-enabled="{ row }"
        ><Badge :variant="row.enabled ? 'default' : 'secondary'">{{
          row.enabled ? '已启用' : '已停用'
        }}</Badge></template
      >
      <template #cell-actions="{ row }"
        ><Button
          variant="ghost"
          size="sm"
          :aria-label="`编辑 ${row.name}`"
          @click="openEditor({ mode: 'edit', id: row.id })"
          >编辑</Button
        ></template
      >
    </DataTable>
    <FormDialog
      v-model:open="isEditorOpen"
      :context="editingContext"
      :title="editingContext.mode === 'create' ? '新增联系人' : '编辑联系人'"
      :fields="contactFields"
      :load="loadForm"
      :submit="saveForm"
      :blocked="blocked"
      @saved="toast.success('保存成功')"
    />
    <Toaster rich-colors />
  </main>
</template>
