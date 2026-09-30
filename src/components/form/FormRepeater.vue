<script setup lang="ts">
import type { FormRepeaterComponentProps } from '@/types/form/repeater'

import { ArrowDown, ArrowUp, Plus, Trash2 } from '@lucide/vue'
import { computed, toRaw } from 'vue'
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

// AI modified: FormRepeater manages repeated array fields with stable UI keys, reordering, and boundary constraints.

const props = withDefaults(defineProps<FormRepeaterComponentProps>(), {
  modelValue: () => [],
  minItems: 0,
  maxItems: 20,
  defaultItemValue: () => ({}),
  disabled: false,
  errorPrefix: '',
  fieldErrors: () => ({}),
})

const emits = defineEmits<{
  (e: 'update:modelValue', value: Record<string, unknown>[]): void
}>()

// AI modified: rendering keeps row identity outside the draft so opening a form stays pristine.
const rowKeys = new WeakMap<object, string>()
let nextRowKey = 0
const repeatedRows = computed(() => props.modelValue || [])

function getRowKey(row: Record<string, unknown>): string {
  const originalRow = toRaw(row)
  let rowKey = rowKeys.get(originalRow)
  if (!rowKey) {
    rowKey = String(++nextRowKey)
    rowKeys.set(originalRow, rowKey)
  }
  return rowKey
}

const canAdd = computed(() => {
  return !props.disabled && repeatedRows.value.length < props.maxItems
})

const canRemove = computed(() => {
  return !props.disabled && repeatedRows.value.length > props.minItems
})

function addItem(): void {
  if (!canAdd.value) return
  const newItem: Record<string, unknown> = structuredClone(props.defaultItemValue || {})
  getRowKey(newItem)
  emits('update:modelValue', [...repeatedRows.value, newItem])
}

function removeItem(index: number): void {
  if (!canRemove.value) return
  const next = [...repeatedRows.value]
  next.splice(index, 1)
  emits('update:modelValue', next)
}

function moveUp(index: number): void {
  if (index <= 0 || props.disabled) return
  const next = [...repeatedRows.value]
  const current = next[index]
  const prev = next[index - 1]
  if (current && prev) {
    next[index - 1] = current
    next[index] = prev
    emits('update:modelValue', next)
  }
}

function moveDown(index: number): void {
  if (index >= repeatedRows.value.length - 1 || props.disabled) return
  const next = [...repeatedRows.value]
  const current = next[index]
  const nextItem = next[index + 1]
  if (current && nextItem) {
    next[index + 1] = current
    next[index] = nextItem
    emits('update:modelValue', next)
  }
}

function updateField(itemIndex: number, fieldName: string, value: unknown): void {
  const next = [...repeatedRows.value]
  const originalRow = next[itemIndex]
  const updatedRow = {
    ...next[itemIndex],
    [fieldName]: value,
  }
  if (originalRow) rowKeys.set(updatedRow, getRowKey(originalRow))
  next[itemIndex] = updatedRow
  emits('update:modelValue', next)
}

function getFieldError(itemIndex: number, fieldName: string): string | undefined {
  // AI modified: Zod issue.path.join('.') uses dot-separated array indices.
  const path = `${props.errorPrefix}.${itemIndex}.${fieldName}`
  return props.fieldErrors[path]
}
</script>

<template>
  <div class="space-y-3">
    <div
      v-for="(item, itemIndex) in repeatedRows"
      :key="getRowKey(item)"
      class="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3.5 transition-colors dark:border-[#30313A] dark:bg-[#1E1F26]"
    >
      <div
        class="mb-2 flex items-center justify-between border-b border-[#E5E7EB] pb-2 text-xs font-medium text-[#6B7280] dark:border-[#30313A] dark:text-[#A1A1AA]"
      >
        <span>#{{ itemIndex + 1 }}</span>
        <div class="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            :disabled="itemIndex === 0 || disabled"
            title="上移"
            @click="moveUp(itemIndex)"
          >
            <ArrowUp class="size-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            :disabled="itemIndex === repeatedRows.length - 1 || disabled"
            title="下移"
            @click="moveDown(itemIndex)"
          >
            <ArrowDown class="size-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            :disabled="!canRemove"
            class="text-[#9CA3AF] hover:text-destructive"
            title="删除"
            @click="removeItem(itemIndex)"
          >
            <Trash2 class="size-3" />
          </Button>
        </div>
      </div>

      <!-- Child Fields Grid -->
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <template v-for="childField in fields" :key="childField.name">
          <div v-if="!childField.visibleWhen || childField.visibleWhen(item)" class="space-y-1.5">
            <label class="block text-xs font-medium text-[#374151] dark:text-[#E5E7EB]">
              {{ childField.label }}
              <span
                v-if="childField.requiredWhen && childField.requiredWhen(item)"
                class="text-destructive"
                >*</span
              >
            </label>

            <!-- Text / Password -->
            <Input
              v-if="childField.type === 'text' || childField.type === 'password'"
              :type="childField.type"
              :placeholder="childField.placeholder"
              :disabled="disabled || (childField.disabledWhen && childField.disabledWhen(item))"
              :model-value="String(item[childField.name] ?? '')"
              @update:model-value="(val) => updateField(itemIndex, childField.name, val)"
            />

            <!-- Number -->
            <Input
              v-else-if="childField.type === 'number'"
              type="number"
              :placeholder="childField.placeholder"
              :disabled="disabled || (childField.disabledWhen && childField.disabledWhen(item))"
              :model-value="String(item[childField.name] ?? '')"
              @update:model-value="(val) => updateField(itemIndex, childField.name, Number(val))"
            />

            <!-- Select -->
            <Select
              v-else-if="childField.type === 'select'"
              :model-value="
                String(
                  childField.options?.findIndex(
                    (option) => option.value === item[childField.name],
                  ) ?? -1,
                )
              "
              :disabled="disabled || (childField.disabledWhen && childField.disabledWhen(item))"
              @update:model-value="
                (index) =>
                  updateField(
                    itemIndex,
                    childField.name,
                    childField.options?.[Number(index)]?.value,
                  )
              "
            >
              <SelectTrigger class="w-full text-xs">
                <SelectValue :placeholder="childField.placeholder || '请选择'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="(option, index) in childField.options || []"
                  :key="index"
                  :value="String(index)"
                  class="text-xs"
                >
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>

            <!-- AI modified: repeated boolean fields follow the same modelValue event contract. -->
            <!-- Checkbox -->
            <div v-else-if="childField.type === 'checkbox'" class="flex items-center gap-2 pt-1">
              <Checkbox
                :model-value="Boolean(item[childField.name])"
                :disabled="disabled || (childField.disabledWhen && childField.disabledWhen(item))"
                @update:model-value="
                  (checked: boolean | 'indeterminate') =>
                    updateField(itemIndex, childField.name, checked === true)
                "
              />
              <span class="text-xs text-[#6B7280] dark:text-[#A1A1AA]">{{
                childField.placeholder
              }}</span>
            </div>

            <!-- Switch -->
            <div v-else-if="childField.type === 'switch'" class="flex items-center gap-2 pt-1">
              <Switch
                :model-value="Boolean(item[childField.name])"
                :disabled="disabled || (childField.disabledWhen && childField.disabledWhen(item))"
                @update:model-value="
                  (checked: boolean) => updateField(itemIndex, childField.name, checked)
                "
              />
            </div>

            <!-- Textarea -->
            <Textarea
              v-else-if="childField.type === 'textarea'"
              :placeholder="childField.placeholder"
              :disabled="disabled || (childField.disabledWhen && childField.disabledWhen(item))"
              :model-value="String(item[childField.name] ?? '')"
              @update:model-value="(val) => updateField(itemIndex, childField.name, val)"
            />

            <p
              v-if="getFieldError(itemIndex, childField.name)"
              class="text-[11px] text-destructive"
            >
              {{ getFieldError(itemIndex, childField.name) }}
            </p>
          </div>
        </template>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-if="repeatedRows.length === 0"
      class="rounded-lg border border-dashed border-[#D1D5DB] py-6 text-center text-xs text-[#9CA3AF] dark:border-[#4B5563]"
    >
      暂无条目
    </div>

    <!-- Add Item Button -->
    <Button
      type="button"
      variant="outline"
      size="sm"
      :disabled="!canAdd"
      class="w-full gap-1.5 border-dashed text-xs"
      @click="addItem"
    >
      <Plus class="size-3.5" />
      添加条目
    </Button>
  </div>
</template>
