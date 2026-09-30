<script setup lang="ts">
import type { FormRichTextComponentProps } from '@/types/form/rich-text'

import {
  Bold,
  Code,
  Columns,
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo,
  Rows,
  Table as TableIcon,
  Trash2,
  Undo,
} from '@lucide/vue'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { Image as TiptapImage } from '@tiptap/extension-image'
import { Link as TiptapLink } from '@tiptap/extension-link'
import { Table as TiptapTable } from '@tiptap/extension-table'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableRow } from '@tiptap/extension-table-row'
import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor, type JSONContent } from '@tiptap/vue-3'
import { onBeforeUnmount, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { codeHighlighter } from '@/lib/code-highlighting'

// AI modified: shared pure types live in the centralized owner directory.

// AI modified: FormRichText integrates Tiptap Vue 3 with StarterKit, Lowlight, Table, Link, and Image upload.

const props = withDefaults(defineProps<FormRichTextComponentProps>(), {
  modelValue: null,
  uploadAdapter: undefined,
  placeholder: '请输入内容...',
  disabled: false,
})

const emits = defineEmits<{
  (e: 'update:modelValue', value: JSONContent): void
  (e: 'uploadingCountChange', count: number): void
}>()

const imageFileInput = ref<HTMLInputElement | null>(null)
const pendingImageUploads = new Set<AbortController>()
let isEditorMounted = true
const codeLanguages = [
  { code: 'plaintext', label: 'Plain text' },
  { code: 'javascript', label: 'JavaScript' },
  { code: 'typescript', label: 'TypeScript' },
  { code: 'json', label: 'JSON' },
  { code: 'bash', label: 'Bash' },
  { code: 'css', label: 'CSS' },
  { code: 'xml', label: 'HTML / XML' },
  { code: 'python', label: 'Python' },
  { code: 'sql', label: 'SQL' },
] as const

const editor = useEditor({
  content: props.modelValue || { type: 'doc', content: [] },
  editable: !props.disabled,
  extensions: [
    StarterKit.configure({
      codeBlock: false,
    }),
    CodeBlockLowlight.configure({
      // AI modified: use the same Lowlight language registry as assistant code blocks.
      lowlight: codeHighlighter,
    }),
    TiptapLink.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-[#8023FF] dark:text-[#A684FF] underline underline-offset-2',
      },
    }),
    TiptapImage.configure({
      HTMLAttributes: {
        class: 'max-w-full rounded-md border border-[#E5E7EB] dark:border-[#30313A] my-2',
      },
    }),
    TiptapTable.configure({
      resizable: true,
      HTMLAttributes: {
        class:
          'border-collapse table-auto w-full my-3 border border-[#E5E7EB] dark:border-[#30313A]',
      },
    }),
    TableRow,
    TableHeader.configure({
      HTMLAttributes: {
        class:
          'border border-[#E5E7EB] dark:border-[#30313A] bg-[#F9FAFB] dark:bg-[#202128] font-semibold p-2 text-left text-xs',
      },
    }),
    TableCell.configure({
      HTMLAttributes: {
        class: 'border border-[#E5E7EB] dark:border-[#30313A] p-2 text-xs',
      },
    }),
  ],
  onUpdate: () => {
    if (!editor.value) return
    emits('update:modelValue', editor.value.getJSON())
  },
})

watch(
  () => props.disabled,
  (val) => {
    editor.value?.setEditable(!val)
  },
)

watch(
  () => props.modelValue,
  (newValue) => {
    if (!editor.value) return
    const isSame = JSON.stringify(editor.value.getJSON()) === JSON.stringify(newValue)
    if (!isSame && newValue) {
      editor.value.commands.setContent(newValue)
    }
  },
)

onBeforeUnmount(() => {
  // AI modified: canceled editors must release the parent form's pending-upload guard.
  isEditorMounted = false
  for (const controller of pendingImageUploads) controller.abort()
  pendingImageUploads.clear()
  emits('uploadingCountChange', 0)
  editor.value?.destroy()
})

function setLink(): void {
  if (!editor.value) return
  const previousUrl = editor.value.getAttributes('link').href
  const url = window.prompt('输入链接地址 (URL)', previousUrl)
  if (url === null) return
  if (url === '') {
    editor.value.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }
  editor.value.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}

function triggerImageUpload(): void {
  if (!props.uploadAdapter) return
  imageFileInput.value?.click()
}

async function handleImageFile(e: Event): Promise<void> {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file || !editor.value || !props.uploadAdapter) return

  // AI modified: report pending Tiptap image uploads before the form may submit.
  const controller = new AbortController()
  pendingImageUploads.add(controller)
  emits('uploadingCountChange', pendingImageUploads.size)
  try {
    const result = await props.uploadAdapter.upload(file, () => {}, controller.signal)
    if (!controller.signal.aborted && result.url) {
      editor.value?.chain().focus().setImage({ src: result.url, alt: file.name }).run()
    }
  } catch {
    if (!controller.signal.aborted) alert('图片上传失败')
  } finally {
    pendingImageUploads.delete(controller)
    if (isEditorMounted) emits('uploadingCountChange', pendingImageUploads.size)
  }
  target.value = ''
}

function insertTable(): void {
  editor.value?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
}

function setCodeLanguage(event: Event): void {
  const language = (event.target as HTMLSelectElement).value
  if (!editor.value?.isActive('codeBlock')) return
  editor.value.chain().focus().updateAttributes('codeBlock', { language }).run()
}
</script>

<template>
  <div
    class="rounded-md border border-[#E5E7EB] bg-white transition-colors focus-within:border-[#8023FF] dark:border-[#30313A] dark:bg-[#1B1C22]"
  >
    <input
      ref="imageFileInput"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleImageFile"
    />

    <!-- Toolbar -->
    <div
      v-if="editor && !disabled"
      class="flex flex-wrap items-center gap-1 border-b border-[#E5E7EB] bg-[#F9FAFB] p-1.5 text-xs dark:border-[#30313A] dark:bg-[#202128]"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        :class="{ 'bg-[#E5E7EB] dark:bg-[#30313A]': editor.isActive('bold') }"
        title="加粗"
        @click="editor.chain().focus().toggleBold().run()"
      >
        <Bold class="size-3.5" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        :class="{ 'bg-[#E5E7EB] dark:bg-[#30313A]': editor.isActive('italic') }"
        title="斜体"
        @click="editor.chain().focus().toggleItalic().run()"
      >
        <Italic class="size-3.5" />
      </Button>

      <div class="mx-1 h-4 w-px bg-[#E5E7EB] dark:bg-[#30313A]" />

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        :class="{ 'bg-[#E5E7EB] dark:bg-[#30313A]': editor.isActive('heading', { level: 1 }) }"
        title="标题 1"
        @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
      >
        <Heading1 class="size-3.5" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        :class="{ 'bg-[#E5E7EB] dark:bg-[#30313A]': editor.isActive('heading', { level: 2 }) }"
        title="标题 2"
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
      >
        <Heading2 class="size-3.5" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        :class="{ 'bg-[#E5E7EB] dark:bg-[#30313A]': editor.isActive('heading', { level: 3 }) }"
        title="标题 3"
        @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
      >
        <Heading3 class="size-3.5" />
      </Button>

      <div class="mx-1 h-4 w-px bg-[#E5E7EB] dark:bg-[#30313A]" />

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        :class="{ 'bg-[#E5E7EB] dark:bg-[#30313A]': editor.isActive('bulletList') }"
        title="无序列表"
        @click="editor.chain().focus().toggleBulletList().run()"
      >
        <List class="size-3.5" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        :class="{ 'bg-[#E5E7EB] dark:bg-[#30313A]': editor.isActive('orderedList') }"
        title="有序列表"
        @click="editor.chain().focus().toggleOrderedList().run()"
      >
        <ListOrdered class="size-3.5" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        :class="{ 'bg-[#E5E7EB] dark:bg-[#30313A]': editor.isActive('blockquote') }"
        title="引用"
        @click="editor.chain().focus().toggleBlockquote().run()"
      >
        <Quote class="size-3.5" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        :class="{ 'bg-[#E5E7EB] dark:bg-[#30313A]': editor.isActive('codeBlock') }"
        title="代码块"
        @click="editor.chain().focus().toggleCodeBlock().run()"
      >
        <Code class="size-3.5" />
      </Button>
      <select
        v-if="editor.isActive('codeBlock')"
        aria-label="代码块语言"
        class="h-7 rounded border border-[#E5E7EB] bg-white px-1 text-xs dark:border-[#30313A] dark:bg-[#1B1C22]"
        :value="String(editor.getAttributes('codeBlock').language || 'plaintext')"
        @change="setCodeLanguage"
      >
        <option v-for="language in codeLanguages" :key="language.code" :value="language.code">
          {{ language.label }}
        </option>
      </select>

      <div class="mx-1 h-4 w-px bg-[#E5E7EB] dark:bg-[#30313A]" />

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        :class="{ 'bg-[#E5E7EB] dark:bg-[#30313A]': editor.isActive('link') }"
        title="链接"
        @click="setLink"
      >
        <LinkIcon class="size-3.5" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        :title="uploadAdapter ? '插入图片' : '图片上传服务未配置'"
        :disabled="!uploadAdapter"
        @click="triggerImageUpload"
      >
        <ImageIcon class="size-3.5" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        :class="{ 'bg-[#E5E7EB] dark:bg-[#30313A]': editor.isActive('table') }"
        title="插入表格"
        @click="insertTable"
      >
        <TableIcon class="size-3.5" />
      </Button>

      <!-- Table Context Actions when inside table -->
      <template v-if="editor.isActive('table')">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          title="添加行"
          @click="editor.chain().focus().addRowAfter().run()"
        >
          <Rows class="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          title="添加列"
          @click="editor.chain().focus().addColumnAfter().run()"
        >
          <Columns class="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          class="text-destructive"
          title="删除表格"
          @click="editor.chain().focus().deleteTable().run()"
        >
          <Trash2 class="size-3.5" />
        </Button>
      </template>

      <div class="ml-auto flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          :disabled="!editor.can().undo()"
          title="撤回"
          @click="editor.chain().focus().undo().run()"
        >
          <Undo class="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          :disabled="!editor.can().redo()"
          title="重做"
          @click="editor.chain().focus().redo().run()"
        >
          <Redo class="size-3.5" />
        </Button>
      </div>
    </div>

    <!-- Content Area -->
    <EditorContent
      :editor="editor"
      class="prose prose-sm dark:prose-invert max-w-none p-3.5 focus:outline-hidden min-h-[140px]"
    />
  </div>
</template>

<style>
/* AI modified: syntax highlighting and prose tweaks for tiptap editor */
.ProseMirror {
  outline: none;
  min-height: 120px;
}
.ProseMirror pre {
  background: #0d1117;
  color: #c9d1d9;
  font-family: monospace;
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
}
.ProseMirror blockquote {
  border-left: 3px solid #8023ff;
  padding-left: 1rem;
  font-style: italic;
}
</style>
