// AI modified: group pure types by stable concepts instead of implementation filenames.
import type { FormFieldConfig } from '@/types/form/fields'

export interface FormRepeaterComponentProps {
  modelValue?: Record<string, unknown>[]
  fields: FormFieldConfig[]
  minItems?: number
  maxItems?: number
  defaultItemValue?: Record<string, unknown>
  disabled?: boolean
  errorPrefix?: string
  fieldErrors?: Record<string, string>
}
