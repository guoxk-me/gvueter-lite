// AI modified: expose form UI and runtime projection while keeping pure types centralized.
export { default as ConfigurableForm } from './ConfigurableForm.vue'
export { default as FormUpload } from './FormUpload.vue'
// AI modified: rich text is loaded by ConfigurableForm only when a Tiptap field is rendered.
export { default as FormRepeater } from './FormRepeater.vue'
export * from './active-field-values'
