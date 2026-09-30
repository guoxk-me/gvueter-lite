import type { FormFieldConfig, FormSection } from '@/types/form/fields'
// AI modified: shared pure types live in the centralized owner directory.

// AI modified: name this module for active-field submission; pure contracts stay in types/form.

/**
 * Projects draft values by extracting only active (visible) fields.
 */
export function projectActiveValues<TDraft extends object, TChild extends object>(
  values: TDraft,
  sections: FormSection<TDraft, TChild>[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const draftValues = values as Record<string, unknown>

  for (const section of sections) {
    for (const field of section.fields) {
      const isVisible = field.visibleWhen ? field.visibleWhen(values) : true
      if (!isVisible) {
        if (field.clearOnHide) {
          delete draftValues[field.name]
        }
        continue
      }

      const val = draftValues[field.name]

      if (field.type === 'nested' && field.nestedFields) {
        if (val && typeof val === 'object') {
          result[field.name] = projectNestedValues(val as TChild, field.nestedFields)
        }
      } else if (field.type === 'array' && Array.isArray(val) && field.arrayConfig?.fields) {
        const itemFields = field.arrayConfig.fields
        result[field.name] = val.map((item: unknown) => {
          const projectedItem = projectNestedValues(item as TChild, itemFields)
          return projectedItem
        })
      } else {
        if (val !== undefined) {
          result[field.name] = val
        }
      }
    }
  }

  return result
}

function projectNestedValues<TItem extends object>(
  item: TItem,
  fields: FormFieldConfig<TItem>[],
): Record<string, unknown> {
  const projected: Record<string, unknown> = {}
  const rowValues = item as Record<string, unknown>
  for (const f of fields) {
    const isVisible = f.visibleWhen ? f.visibleWhen(item) : true
    if (!isVisible) continue
    const v = rowValues[f.name]
    if (v !== undefined) {
      projected[f.name] = v
    }
  }
  return projected
}
