// AI modified: group pure types by stable concepts instead of implementation filenames.
import type { ZodType } from 'zod'
import type { FormSection } from '@/types/form/fields'

export interface ConfigurableFormComponentProps<TDraft extends object, TSubmit = TDraft> {
  defaultValues: TDraft
  validationSchema?: ZodType<TSubmit>
  sections: FormSection<TDraft>[]
  isSubmitting?: boolean
  submitText?: string
  cancelText?: string
  showFooter?: boolean
}

export interface ConfigurableFormProps<
  TDraft extends object = Record<string, unknown>,
  TSubmit = TDraft,
  TChild extends object = Record<string, unknown>,
> {
  defaultValues: TDraft
  validationSchema?: ZodType<TSubmit>
  sections: FormSection<TDraft, TChild>[]
  isSubmitting?: boolean
  submitText?: string
  cancelText?: string
}
