/// <reference types="vite-plus/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
}

// AI modified: locale imports contain precompiled Vue I18n messages at runtime.
declare module '*.yaml' {
  const content: Record<string, Record<string, import('vue-i18n').VueMessageType>>
  export default content
}

declare module '*.yml' {
  const content: Record<string, Record<string, import('vue-i18n').VueMessageType>>
  export default content
}
