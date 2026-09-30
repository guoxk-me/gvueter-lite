import { onMounted, onUnmounted } from 'vue'
import { z } from 'zod'
import { useTheme } from '@/composables/useTheme'
import { setLocale } from '@/i18n'

interface WebMcpTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, { type: 'string'; enum: string[] }>
    required: string[]
  }
  execute: (input: unknown) => Promise<string>
}

interface WebMcpContext {
  registerTool: (tool: WebMcpTool, options: { signal: AbortSignal }) => Promise<void>
}

const themeInput = z.object({ theme: z.enum(['light', 'dark', 'system']) })
const languageInput = z.object({ language: z.enum(['zh-CN', 'en-US']) })

// AI modified: expose only existing, reversible login preferences through the native WebMCP API.
export function useLoginWebMcp(): void {
  const { setTheme } = useTheme()
  const registration = new AbortController()

  onMounted(() => {
    const modelContext = (document as Document & { modelContext?: WebMcpContext }).modelContext
    if (!modelContext) return

    const themeRegistration = modelContext.registerTool(
      {
        name: 'set_login_theme',
        description: 'Set the login page theme to light, dark, or system.',
        inputSchema: {
          type: 'object',
          properties: { theme: { type: 'string', enum: ['light', 'dark', 'system'] } },
          required: ['theme'],
        },
        execute: async (input) => {
          const selectedTheme = themeInput.safeParse(input)
          if (!selectedTheme.success) throw new Error('Theme must be light, dark, or system.')
          setTheme(selectedTheme.data.theme)
          return `Login theme set to ${selectedTheme.data.theme}.`
        },
      },
      { signal: registration.signal },
    )

    const languageRegistration = modelContext.registerTool(
      {
        name: 'set_login_language',
        description: 'Set the login page language to Simplified Chinese or English.',
        inputSchema: {
          type: 'object',
          properties: { language: { type: 'string', enum: ['zh-CN', 'en-US'] } },
          required: ['language'],
        },
        execute: async (input) => {
          const selectedLanguage = languageInput.safeParse(input)
          if (!selectedLanguage.success) throw new Error('Language must be zh-CN or en-US.')
          setLocale(selectedLanguage.data.language)
          return `Login language set to ${selectedLanguage.data.language}.`
        },
      },
      { signal: registration.signal },
    )

    void Promise.all([themeRegistration, languageRegistration]).catch((error: unknown) => {
      console.warn('WebMCP login tool registration failed.', error)
    })
  })

  onUnmounted(() => registration.abort())
}
