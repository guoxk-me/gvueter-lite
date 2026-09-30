// AI modified: group pure types by stable concepts instead of implementation filenames.
import type { UploadAdapter } from '@/types/form/upload'

export type FormFieldType =
  | 'text'
  | 'number'
  | 'password'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'switch'
  | 'date'
  | 'upload'
  | 'tiptap'
  | 'array'
  | 'nested'

export interface FormSelectOption {
  label: string
  value: string | number | boolean
}

export type FieldName<TValues extends object> = keyof TValues extends never
  ? string
  : Extract<keyof TValues, string>

export interface FormArrayConfig<TItem extends object = Record<string, unknown>> {
  minItems?: number
  maxItems?: number
  defaultItemValue?: Partial<TItem>
  fields: FormFieldConfig<TItem>[]
}

export interface FormFieldConfig<
  TDraft extends object = Record<string, unknown>,
  TChild extends object = Record<string, unknown>,
> {
  name: FieldName<TDraft>
  label: string
  type: FormFieldType
  placeholder?: string
  autocomplete?: string
  description?: string
  options?: FormSelectOption[]
  visibleWhen?: (values: TDraft) => boolean
  disabledWhen?: (values: TDraft) => boolean
  requiredWhen?: (values: TDraft) => boolean
  clearOnHide?: boolean
  // Upload config
  uploadAdapter?: UploadAdapter
  accept?: string
  maxFileSize?: number
  multiple?: boolean
  maxFiles?: number
  // Array / Repeated config
  arrayConfig?: FormArrayConfig<TChild>
  // Nested fields config
  nestedFields?: FormFieldConfig<TChild>[]
}

export interface FormSection<
  TDraft extends object = Record<string, unknown>,
  TChild extends object = Record<string, unknown>,
> {
  id?: string
  title?: string
  description?: string
  columns?: 1 | 2
  fields: FormFieldConfig<TDraft, TChild>[]
}
