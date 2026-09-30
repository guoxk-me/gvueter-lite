<script setup lang="ts">
import type { UploadFileResult } from '@/types/form/upload'
import type { UploadItem, FormUploadComponentProps } from '@/types/form/upload'

import { AlertCircle, FileText, LoaderCircle, RefreshCw, UploadCloud, X } from '@lucide/vue'
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'

// AI modified: shared pure types live in the centralized owner directory.

// AI modified: FormUpload provides file upload with progress, cancellation, retry, and preview using injectable adapters.

const props = withDefaults(defineProps<FormUploadComponentProps>(), {
  modelValue: null,
  uploadAdapter: undefined,
  accept: undefined,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  multiple: false,
  maxFiles: 5,
  disabled: false,
})

const emits = defineEmits<{
  (e: 'update:modelValue', value: UploadFileResult | UploadFileResult[] | null): void
  (e: 'uploadingCountChange', count: number): void
}>()

const { t, te } = useI18n()
const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const activeUploads = ref<UploadItem[]>([])
let isUploadMounted = true

onBeforeUnmount(() => {
  // AI modified: hidden upload fields release their pending state when unmounted.
  isUploadMounted = false
  for (const upload of activeUploads.value) upload.abortController?.abort()
  activeUploads.value = []
  emits('uploadingCountChange', 0)
})

// AI modified: uploads require an explicit adapter so temporary URLs cannot masquerade as saved files.
const canUpload = computed(() => !props.disabled && Boolean(props.uploadAdapter))

const currentResults = computed<UploadFileResult[]>(() => {
  if (!props.modelValue) return []
  return Array.isArray(props.modelValue) ? props.modelValue : [props.modelValue]
})

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function triggerFilePicker(): void {
  if (!canUpload.value) return
  fileInput.value?.click()
}

function handleFileChange(event: Event): void {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return
  processFiles(Array.from(target.files))
  target.value = ''
}

function handleDrop(event: DragEvent): void {
  isDragging.value = false
  if (!canUpload.value) return
  if (!event.dataTransfer?.files) return
  processFiles(Array.from(event.dataTransfer.files))
}

function processFiles(files: File[]): void {
  if (!canUpload.value) return
  const availableSlots = props.multiple
    ? props.maxFiles - currentResults.value.length - activeUploads.value.length
    : 1

  const candidates = files.slice(0, Math.max(0, availableSlots))

  for (const file of candidates) {
    if (file.size > props.maxFileSize) {
      alert(`文件 ${file.name} 超过最大大小限制 (${formatSize(props.maxFileSize)})`)
      continue
    }

    const item: UploadItem = {
      id: 'item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      file,
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'uploading',
    }

    if (!props.multiple) {
      activeUploads.value = [item]
    } else {
      activeUploads.value.push(item)
    }

    startUpload(item)
  }
}

async function startUpload(item: UploadItem): Promise<void> {
  const uploadAdapter = props.uploadAdapter
  if (!uploadAdapter) return
  const controller = new AbortController()
  item.abortController = controller
  item.status = 'uploading'
  item.progress = 0
  item.errorMessage = undefined
  notifyUploadingCount()

  try {
    const result = await uploadAdapter.upload(
      item.file,
      (percent) => {
        item.progress = percent
      },
      controller.signal,
    )

    if (controller.signal.aborted) return

    item.status = 'success'
    item.result = result

    // Commit to modelValue
    if (props.multiple) {
      emits('update:modelValue', [...currentResults.value, result])
    } else {
      emits('update:modelValue', result)
    }

    // Remove from activeUploads once committed
    activeUploads.value = activeUploads.value.filter((i) => i.id !== item.id)
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      activeUploads.value = activeUploads.value.filter((i) => i.id !== item.id)
    } else {
      item.status = 'error'
      item.errorMessage = error instanceof Error ? error.message : t('form.uploadFailed')
    }
  } finally {
    notifyUploadingCount()
  }
}

function cancelUpload(item: UploadItem): void {
  item.abortController?.abort()
  activeUploads.value = activeUploads.value.filter((i) => i.id !== item.id)
  notifyUploadingCount()
}

function retryUpload(item: UploadItem): void {
  startUpload(item)
}

function removeResult(target: UploadFileResult): void {
  if (props.disabled) return
  if (props.multiple) {
    emits(
      'update:modelValue',
      currentResults.value.filter((r) => r.id !== target.id),
    )
  } else {
    emits('update:modelValue', null)
  }
}

function notifyUploadingCount(): void {
  const uploading = activeUploads.value.filter((i) => i.status === 'uploading').length
  if (isUploadMounted) emits('uploadingCountChange', uploading)
}
</script>

<template>
  <div class="space-y-3">
    <!-- Hidden input -->
    <input
      ref="fileInput"
      type="file"
      class="hidden"
      :accept="accept"
      :multiple="multiple"
      :disabled="!canUpload"
      @change="handleFileChange"
    />

    <!-- Drop Zone -->
    <div
      class="relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-5 text-center transition-colors"
      :class="[
        !canUpload
          ? 'cursor-not-allowed border-[#E5E7EB] bg-[#F9FAFB] opacity-60 dark:border-[#30313A] dark:bg-[#1B1C22]'
          : isDragging
            ? 'border-[#8023FF] bg-[#F5F3FF] dark:bg-[#251D31]'
            : 'cursor-pointer border-[#D1D5DB] hover:border-[#8023FF] dark:border-[#4B5563] dark:hover:border-[#A684FF]',
      ]"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
      @click="triggerFilePicker"
    >
      <UploadCloud class="size-8 text-[#9CA3AF] dark:text-[#6B7280]" />
      <p class="mt-2 text-xs font-medium text-[#374151] dark:text-[#E5E7EB]">
        {{ uploadAdapter ? '点击或拖拽文件到此处上传' : t('form.uploadAdapterRequired') }}
      </p>
      <p class="mt-1 text-[11px] text-[#9CA3AF] dark:text-[#6B7280]">
        最大支持 {{ formatSize(maxFileSize) }}
        <span v-if="accept"> · 格式限制: {{ accept }}</span>
      </p>
    </div>

    <!-- Active Uploads (Progress & Retry) -->
    <div v-if="activeUploads.length > 0" class="space-y-2">
      <div
        v-for="item in activeUploads"
        :key="item.id"
        class="flex items-center justify-between rounded-md border border-[#E5E7EB] bg-[#F9FAFB] p-2.5 text-xs dark:border-[#30313A] dark:bg-[#202128]"
      >
        <div class="flex min-w-0 flex-1 items-center gap-2 pr-2">
          <FileText class="size-4 shrink-0 text-[#6B7280]" />
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between text-[11px]">
              <span class="truncate font-medium text-[#374151] dark:text-[#E5E7EB]">{{
                item.name
              }}</span>
              <span class="text-[#9CA3AF]">{{ item.progress }}%</span>
            </div>
            <!-- Progress Bar -->
            <div
              class="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#E5E7EB] dark:bg-[#30313A]"
            >
              <div
                class="h-full bg-[#8023FF] transition-all duration-150"
                :style="{ width: item.progress + '%' }"
              />
            </div>
          </div>
        </div>

        <div class="flex items-center gap-1">
          <template v-if="item.status === 'uploading'">
            <Button
              variant="ghost"
              size="icon-xs"
              title="取消上传"
              @click.stop="cancelUpload(item)"
            >
              <X class="size-3.5" />
            </Button>
          </template>
          <template v-else-if="item.status === 'error'">
            <span class="mr-1 text-[11px] text-destructive">{{ item.errorMessage }}</span>
            <Button variant="ghost" size="icon-xs" title="重试" @click.stop="retryUpload(item)">
              <RefreshCw class="size-3.5" />
            </Button>
          </template>
        </div>
      </div>
    </div>

    <!-- Uploaded Files List -->
    <div v-if="currentResults.length > 0" class="space-y-2">
      <div
        v-for="res in currentResults"
        :key="res.id"
        class="flex items-center justify-between rounded-md border border-[#E5E7EB] bg-white p-2.5 text-xs dark:border-[#30313A] dark:bg-[#1B1C22]"
      >
        <div class="flex min-w-0 items-center gap-2">
          <img
            v-if="res.url && res.mimeType?.startsWith('image/')"
            :src="res.url"
            alt="预览"
            class="size-8 rounded object-cover"
          />
          <FileText v-else class="size-4 shrink-0 text-[#8023FF]" />
          <div class="min-w-0">
            <span class="block truncate font-medium text-[#374151] dark:text-[#E5E7EB]">{{
              res.name
            }}</span>
            <span v-if="res.size" class="block text-[11px] text-[#9CA3AF]">{{
              formatSize(res.size)
            }}</span>
          </div>
        </div>

        <Button
          v-if="!disabled"
          variant="ghost"
          size="icon-xs"
          class="text-[#9CA3AF] hover:text-destructive"
          title="移除文件"
          @click="removeResult(res)"
        >
          <X class="size-3.5" />
        </Button>
      </div>
    </div>
  </div>
</template>
