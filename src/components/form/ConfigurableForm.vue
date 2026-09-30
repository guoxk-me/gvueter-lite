<script setup lang="ts" generic="TDraft extends object, TSubmit = TDraft">
import type { FormFieldConfig } from '@/types/form/fields'
import type { UploadFileResult } from '@/types/form/upload'
import type { ConfigurableFormComponentProps } from '@/types/form/component-contracts'

import { LoaderCircle } from '@lucide/vue'
import { computed, defineAsyncComponent, ref, toRaw, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import FormRepeater from './FormRepeater.vue'
import FormUpload from './FormUpload.vue'
import { projectActiveValues } from './active-field-values'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

// AI modified: shared pure types live in the centralized owner directory.

// AI modified: ConfigurableForm implements schema-driven forms with active field projection, conditional visibility, and upload handling.

import type { JSONContent } from '@tiptap/vue-3'

// AI modified: forms without a rich-text field do not load Tiptap and syntax grammars.
const FormRichText = defineAsyncComponent(() => import('./FormRichText.vue'))

const props = withDefaults(defineProps<ConfigurableFormComponentProps<TDraft, TSubmit>>(), {
  validationSchema: undefined,
  isSubmitting: false,
  submitText: undefined,
  cancelText: undefined,
  showFooter: true,
})

const emits = defineEmits<{
  (e: 'submit', submission: TSubmit): void
  (e: 'cancel'): void
  (e: 'update:isDirty', isDirty: boolean): void
  (e: 'change', values: TDraft): void
}>()

const { t, te } = useI18n()

// Clone initial draft values
const values = ref(structuredClone(toRaw(props.defaultValues))) as Ref<TDraft>
const fieldErrors = ref<Record<string, string>>({})
// AI modified: track each upload field so one completion cannot unblock another pending upload.
const activeUploadCounts = ref<Record<string, number>>({})

function setActiveUploadCount(fieldName: string, count: number): void {
  if (count > 0) activeUploadCounts.value[fieldName] = count
  else delete activeUploadCounts.value[fieldName]
}

const isDirty = computed<boolean>(() => {
  return JSON.stringify(values.value) !== JSON.stringify(props.defaultValues)
})

watch(isDirty, (dirty) => {
  emits('update:isDirty', dirty)
})

watch(
  values,
  (newVal) => {
    emits('change', newVal as TDraft)
  },
  { deep: true },
)

function getFieldValue(path: string): unknown {
  return (values.value as Record<string, unknown>)[path]
}

function getUploadValue(path: string): UploadFileResult | UploadFileResult[] | null {
  return getFieldValue(path) as UploadFileResult | UploadFileResult[] | null
}

function getRichTextValue(path: string): JSONContent | string | null {
  return getFieldValue(path) as JSONContent | string | null
}

function getRepeatedValues(path: string): Record<string, unknown>[] {
  return (getFieldValue(path) as Record<string, unknown>[] | undefined) ?? []
}

function getNestedFieldValue(parentPath: string, childName: string): unknown {
  const parentValue = getFieldValue(parentPath)
  if (!parentValue || typeof parentValue !== 'object') return undefined
  return (parentValue as Record<string, unknown>)[childName]
}

function setFieldValue(path: string, val: unknown): void {
  ;(values.value as Record<string, unknown>)[path] = val
  if (fieldErrors.value[path]) {
    delete fieldErrors.value[path]
  }
}

function handleNestedFieldUpdate(parentPath: string, childName: string, val: unknown): void {
  const draftValues = values.value as Record<string, unknown>
  if (!draftValues[parentPath] || typeof draftValues[parentPath] !== 'object') {
    draftValues[parentPath] = {}
  }
  ;(draftValues[parentPath] as Record<string, unknown>)[childName] = val
  const fullPath = `${parentPath}.${childName}`
  if (fieldErrors.value[fullPath]) {
    delete fieldErrors.value[fullPath]
  }
}

function isFieldVisible(field: FormFieldConfig<TDraft>): boolean {
  if (!field.visibleWhen) return true
  const visible = field.visibleWhen(values.value)
  if (!visible && field.clearOnHide) {
    delete (values.value as Record<string, unknown>)[field.name]
  }
  return visible
}

function isFieldDisabled(field: FormFieldConfig<TDraft>): boolean {
  if (props.isSubmitting) return true
  if (field.disabledWhen) return field.disabledWhen(values.value)
  return false
}

function isNestedFieldDisabled(parentPath: string, field: FormFieldConfig): boolean {
  if (props.isSubmitting) return true
  const parentValue = getFieldValue(parentPath)
  if (!parentValue || typeof parentValue !== 'object') return false
  return field.disabledWhen?.(parentValue as Record<string, unknown>) ?? false
}

function isFieldRequired(field: FormFieldConfig<TDraft>): boolean {
  if (field.requiredWhen) return field.requiredWhen(values.value)
  return false
}

async function handleSubmit(): Promise<void> {
  if (props.isSubmitting) return

  if (Object.values(activeUploadCounts.value).some((count) => count > 0)) {
    alert('请等待文件上传完成')
    return
  }

  // AI modified: project active fields so hidden inputs are not submitted or validated.
  const submissionCandidate = projectActiveValues(values.value, props.sections)

  if (props.validationSchema) {
    const parsed = props.validationSchema.safeParse(submissionCandidate)
    if (!parsed.success) {
      const errors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.')
        if (!errors[path]) {
          errors[path] = issue.message
        }
      }
      fieldErrors.value = errors
      return
    }

    fieldErrors.value = {}
    emits('submit', parsed.data)
  } else {
    fieldErrors.value = {}
    emits('submit', submissionCandidate as unknown as TSubmit)
  }
}

function resetForm(): void {
  values.value = structuredClone(toRaw(props.defaultValues))
  fieldErrors.value = {}
}

defineExpose({
  values,
  isDirty,
  fieldErrors,
  submit: handleSubmit,
  reset: resetForm,
})
</script>

<template>
  <form class="space-y-6" @submit.prevent="handleSubmit">
    <!-- Form Sections -->
    <div
      v-for="section in sections"
      :key="section.id || section.title || 'default-section'"
      class="space-y-4"
    >
      <div
        v-if="section.title || section.description"
        class="border-b border-[#E5E7EB] pb-2 dark:border-[#30313A]"
      >
        <h3 v-if="section.title" class="text-sm font-semibold text-[#111827] dark:text-[#F3F4F6]">
          {{ section.title }}
        </h3>
        <p v-if="section.description" class="text-xs text-[#6B7280] dark:text-[#A1A1AA]">
          {{ section.description }}
        </p>
      </div>

      <!-- Fields Grid -->
      <div :class="[section.columns === 2 ? 'grid grid-cols-1 gap-4 md:grid-cols-2' : 'space-y-4']">
        <template v-for="field in section.fields" :key="field.name">
          <div
            v-if="isFieldVisible(field)"
            class="space-y-1.5"
            :class="
              field.type === 'tiptap' || field.type === 'array' || field.type === 'upload'
                ? 'col-span-full'
                : ''
            "
          >
            <!-- Custom Field Slot -->
            <slot
              :name="'field-' + field.name"
              :field="field"
              :value="getFieldValue(field.name)"
              :set-value="(val: unknown) => setFieldValue(field.name, val)"
              :error="fieldErrors[field.name]"
            >
              <!-- Field Label -->
              <label
                v-if="field.type !== 'checkbox' && field.type !== 'switch'"
                :for="'input-' + field.name"
                class="block text-xs font-medium text-[#374151] dark:text-[#E5E7EB]"
              >
                {{ field.label }}
                <span v-if="isFieldRequired(field)" class="text-destructive">*</span>
              </label>

              <!-- Text / Password -->
              <Input
                v-if="field.type === 'text' || field.type === 'password'"
                :id="'input-' + field.name"
                :type="field.type"
                :placeholder="field.placeholder"
                :autocomplete="field.autocomplete"
                :disabled="isFieldDisabled(field)"
                :model-value="String(getFieldValue(field.name) ?? '')"
                :class="{
                  'border-destructive ring-1 ring-destructive/40': fieldErrors[field.name],
                }"
                @update:model-value="(val) => setFieldValue(field.name, val)"
              />

              <!-- Number -->
              <Input
                v-else-if="field.type === 'number'"
                :id="'input-' + field.name"
                type="number"
                :placeholder="field.placeholder"
                :disabled="isFieldDisabled(field)"
                :model-value="String(getFieldValue(field.name) ?? '')"
                :class="{
                  'border-destructive ring-1 ring-destructive/40': fieldErrors[field.name],
                }"
                @update:model-value="
                  (val) => setFieldValue(field.name, val === '' ? undefined : Number(val))
                "
              />

              <!-- Textarea -->
              <Textarea
                v-else-if="field.type === 'textarea'"
                :id="'input-' + field.name"
                :placeholder="field.placeholder"
                :disabled="isFieldDisabled(field)"
                :model-value="String(getFieldValue(field.name) ?? '')"
                :class="{
                  'border-destructive ring-1 ring-destructive/40': fieldErrors[field.name],
                }"
                @update:model-value="(val) => setFieldValue(field.name, val)"
              />

              <!-- Select -->
              <Select
                v-else-if="field.type === 'select'"
                :model-value="
                  String(
                    field.options?.findIndex(
                      (option) => option.value === getFieldValue(field.name),
                    ) ?? -1,
                  )
                "
                :disabled="isFieldDisabled(field)"
                @update:model-value="
                  (index) => setFieldValue(field.name, field.options?.[Number(index)]?.value)
                "
              >
                <SelectTrigger
                  :id="'input-' + field.name"
                  class="w-full text-xs"
                  :class="{
                    'border-destructive ring-1 ring-destructive/40': fieldErrors[field.name],
                  }"
                >
                  <SelectValue :placeholder="field.placeholder || '请选择'" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="(option, index) in field.options || []"
                    :key="index"
                    :value="String(index)"
                    class="text-xs"
                  >
                    {{ option.label }}
                  </SelectItem>
                </SelectContent>
              </Select>

              <!-- AI modified: shadcn-vue checkbox and switch use modelValue updates. -->
              <!-- Checkbox -->
              <div v-else-if="field.type === 'checkbox'" class="flex items-center gap-2 pt-1">
                <Checkbox
                  :id="'input-' + field.name"
                  :model-value="Boolean(getFieldValue(field.name))"
                  :disabled="isFieldDisabled(field)"
                  @update:model-value="
                    (checked: boolean | 'indeterminate') =>
                      setFieldValue(field.name, checked === true)
                  "
                />
                <label
                  :for="'input-' + field.name"
                  class="cursor-pointer text-xs font-medium text-[#374151] dark:text-[#E5E7EB]"
                >
                  {{ field.label }}
                  <span v-if="isFieldRequired(field)" class="text-destructive">*</span>
                </label>
              </div>

              <!-- Switch -->
              <div
                v-else-if="field.type === 'switch'"
                class="flex items-center justify-between py-1"
              >
                <div>
                  <label
                    :for="'input-' + field.name"
                    class="cursor-pointer text-xs font-medium text-[#374151] dark:text-[#E5E7EB]"
                  >
                    {{ field.label }}
                    <span v-if="isFieldRequired(field)" class="text-destructive">*</span>
                  </label>
                  <p
                    v-if="field.description"
                    class="text-[11px] text-[#6B7280] dark:text-[#A1A1AA]"
                  >
                    {{ field.description }}
                  </p>
                </div>
                <Switch
                  :id="'input-' + field.name"
                  :model-value="Boolean(getFieldValue(field.name))"
                  :disabled="isFieldDisabled(field)"
                  @update:model-value="(checked: boolean) => setFieldValue(field.name, checked)"
                />
              </div>

              <!-- Date -->
              <Input
                v-else-if="field.type === 'date'"
                :id="'input-' + field.name"
                type="date"
                :disabled="isFieldDisabled(field)"
                :model-value="String(getFieldValue(field.name) ?? '')"
                :class="{
                  'border-destructive ring-1 ring-destructive/40': fieldErrors[field.name],
                }"
                @update:model-value="(val) => setFieldValue(field.name, val)"
              />

              <!-- Upload -->
              <FormUpload
                v-else-if="field.type === 'upload'"
                :model-value="getUploadValue(field.name)"
                :upload-adapter="field.uploadAdapter"
                :accept="field.accept"
                :max-file-size="field.maxFileSize"
                :multiple="field.multiple"
                :max-files="field.maxFiles"
                :disabled="isFieldDisabled(field)"
                @update:model-value="(val) => setFieldValue(field.name, val)"
                @uploading-count-change="(count) => setActiveUploadCount(field.name, count)"
              />

              <!-- Tiptap Rich Text -->
              <FormRichText
                v-else-if="field.type === 'tiptap'"
                :model-value="getRichTextValue(field.name)"
                :upload-adapter="field.uploadAdapter"
                :placeholder="field.placeholder"
                :disabled="isFieldDisabled(field)"
                @update:model-value="(json) => setFieldValue(field.name, json)"
                @uploading-count-change="(count) => setActiveUploadCount(field.name, count)"
              />

              <!-- Repeated Array -->
              <FormRepeater
                v-else-if="field.type === 'array' && field.arrayConfig"
                :model-value="getRepeatedValues(field.name)"
                :fields="field.arrayConfig.fields"
                :min-items="field.arrayConfig.minItems"
                :max-items="field.arrayConfig.maxItems"
                :default-item-value="field.arrayConfig.defaultItemValue"
                :disabled="isFieldDisabled(field)"
                :error-prefix="field.name"
                :field-errors="fieldErrors"
                @update:model-value="(arr) => setFieldValue(field.name, arr)"
              />

              <!-- Nested Group -->
              <div
                v-else-if="field.type === 'nested' && field.nestedFields"
                class="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4 space-y-3 dark:border-[#30313A] dark:bg-[#1E1F26]"
              >
                <div v-for="subField in field.nestedFields" :key="subField.name" class="space-y-1">
                  <label class="block text-xs font-medium text-[#374151] dark:text-[#E5E7EB]">
                    {{ subField.label }}
                  </label>
                  <Input
                    :type="subField.type === 'password' ? 'password' : 'text'"
                    :placeholder="subField.placeholder"
                    :disabled="isNestedFieldDisabled(field.name, subField)"
                    :model-value="String(getNestedFieldValue(field.name, subField.name) ?? '')"
                    @update:model-value="
                      (val) => handleNestedFieldUpdate(field.name, subField.name, val)
                    "
                  />
                  <p
                    v-if="fieldErrors[`${field.name}.${subField.name}`]"
                    class="text-[11px] text-destructive"
                  >
                    {{ fieldErrors[`${field.name}.${subField.name}`] }}
                  </p>
                </div>
              </div>

              <!-- Field Description -->
              <p
                v-if="field.description && field.type !== 'switch'"
                class="text-[11px] text-[#6B7280] dark:text-[#A1A1AA]"
              >
                {{ field.description }}
              </p>

              <!-- Field Error -->
              <p v-if="fieldErrors[field.name]" class="text-[11px] text-destructive">
                {{ fieldErrors[field.name] }}
              </p>
            </slot>
          </div>
        </template>
      </div>
    </div>

    <!-- Footer Actions -->
    <div
      v-if="showFooter"
      class="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E7EB] dark:border-[#30313A]"
    >
      <slot name="actions" :is-submitting="isSubmitting" :reset="resetForm">
        <Button
          type="button"
          variant="outline"
          class="cursor-pointer"
          :disabled="isSubmitting"
          @click="emits('cancel')"
        >
          {{ cancelText || (te('common.cancel') ? t('common.cancel') : '取消') }}
        </Button>
        <Button
          type="submit"
          class="cursor-pointer gap-1.5 bg-[#8023FF] text-white hover:bg-[#6D1BDE] dark:bg-[#8023FF] dark:hover:bg-[#6D1BDE]"
          :disabled="isSubmitting"
        >
          <LoaderCircle v-if="isSubmitting" class="size-4 animate-spin" />
          <span>{{ submitText || (te('common.save') ? t('common.save') : '保存') }}</span>
        </Button>
      </slot>
    </div>
  </form>
</template>
