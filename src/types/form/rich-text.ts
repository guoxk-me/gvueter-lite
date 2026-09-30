// AI modified: group pure types by stable concepts instead of implementation filenames.
import type { JSONContent } from '@tiptap/vue-3'
import type { UploadAdapter } from '@/types/form/upload'

export interface FormRichTextComponentProps {
  modelValue?: JSONContent | string | null
  uploadAdapter?: UploadAdapter
  placeholder?: string
  disabled?: boolean
}
