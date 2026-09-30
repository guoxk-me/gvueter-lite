import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { VueQueryPlugin } from '@tanstack/vue-query'
import LoginPage from './LoginPage.vue'
import { queryClient } from '@/composables/query-client'
import { useTheme } from '@/composables/useTheme'
import { i18n, setLocale } from '@/i18n'

const authRequest = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@/composables/request', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/composables/request')>()),
  http: authRequest,
}))

// AI modified: unit tests for LoginPage integration, notices, and theme toggling.
describe('LoginPage', () => {
  beforeEach(() => {
    authRequest.get.mockReset()
    authRequest.post.mockReset()
    queryClient.clear()
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    setLocale('zh-CN')
    useTheme().setTheme('light')
  })

  afterEach(() => {
    delete (document as Document & { modelContext?: unknown }).modelContext
    vi.unstubAllGlobals()
  })

  function mountLoginPage() {
    const root = document.createElement('div')
    document.body.appendChild(root)

    const app = createApp(LoginPage)
    app.use(i18n)
    app.use(VueQueryPlugin, { queryClient })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'login', component: LoginPage },
        { path: '/dashboard', name: 'dashboard', component: { template: '<div>Dashboard</div>' } },
      ],
    })
    app.use(router)
    const vm = app.mount(root)

    return {
      root,
      vm,
      router,
      destroy: () => {
        app.unmount()
        root.remove()
      },
    }
  }

  it('renders brand elements and titles correctly', () => {
    const { root, destroy } = mountLoginPage()

    expect(root.textContent).toContain('Gvueter')
    expect(root.textContent).toContain('Lite')
    expect(root.textContent).toContain('登录仪表盘')
    expect(root.querySelector('.brand-mark')).not.toBeNull()

    destroy()
  })

  it('switches both preferences directly and updates their current icons', async () => {
    const { root, destroy } = mountLoginPage()
    const themeButton = root.querySelector(
      'button[aria-label="当前浅色，点击切换主题"]',
    ) as HTMLButtonElement
    const languageButton = root.querySelector(
      'button[aria-label="切换为English"]',
    ) as HTMLButtonElement

    expect(themeButton.querySelector('.lucide-sun')).not.toBeNull()
    expect(languageButton.textContent).toBe('中')

    themeButton.click()
    languageButton.click()
    await nextTick()
    expect(themeButton.querySelector('.lucide-moon')).not.toBeNull()
    expect(themeButton.getAttribute('aria-label')).toBe(
      'Current theme: Dark. Click to switch theme',
    )
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(languageButton.textContent).toBe('EN')
    expect(languageButton.getAttribute('aria-label')).toBe('Switch to 中文')

    themeButton.click()
    await nextTick()
    expect(themeButton.querySelector('.lucide-monitor')).not.toBeNull()
    expect(localStorage.getItem('gvueter-lite-theme')).toBe('system')

    destroy()
  })

  it('signs in through the auth endpoint and opens the dashboard', async () => {
    const user = { id: 'user-1', email: 'user@company.com', name: 'User' }
    authRequest.post.mockResolvedValue(user)
    authRequest.get.mockResolvedValue(user)
    const { root, router, destroy } = mountLoginPage()

    const emailInput = root.querySelector('#work-email') as HTMLInputElement
    emailInput.value = 'user@company.com'
    emailInput.dispatchEvent(new Event('input', { bubbles: true }))

    const passwordInput = root.querySelector('#password') as HTMLInputElement
    passwordInput.value = 'Secret123!'
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }))

    const form = root.querySelector('form') as HTMLFormElement
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await nextTick()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))

    expect(authRequest.post).toHaveBeenCalledWith(
      'session/login',
      expect.objectContaining({ email: 'user@company.com' }),
    )
    expect(router.currentRoute.value.path).toBe('/dashboard')

    destroy()
  })

  it('displays notice when forgot password or support link is clicked', async () => {
    const { root, destroy } = mountLoginPage()

    // Find forgot password button
    const buttons = Array.from(root.querySelectorAll('button'))
    const forgotBtn = buttons.find((btn) => btn.textContent?.includes('忘记密码？'))
    expect(forgotBtn).toBeDefined()
    forgotBtn?.click()
    await nextTick()

    let alert = root.querySelector('[role="alert"]')
    expect(alert?.textContent).toContain('找回密码功能尚未开通')

    // Find contact support button
    const supportBtn = buttons.find((btn) => btn.textContent?.includes('联系管理员'))
    expect(supportBtn).toBeDefined()
    supportBtn?.click()
    await nextTick()

    alert = root.querySelector('[role="alert"]')
    expect(alert?.textContent).toContain('请联系系统管理员获取帮助')

    destroy()
  })

  it('registers login preference WebMCP tools and removes them on unmount', async () => {
    const registeredTools = new Map<
      string,
      { execute: (input: unknown) => Promise<string>; signal: AbortSignal }
    >()
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      value: {
        registerTool: async (
          tool: { name: string; execute: (input: unknown) => Promise<string> },
          options: { signal: AbortSignal },
        ) => {
          registeredTools.set(tool.name, { execute: tool.execute, signal: options.signal })
        },
      },
    })

    const { root, destroy } = mountLoginPage()
    const themeTool = registeredTools.get('set_login_theme')
    const languageTool = registeredTools.get('set_login_language')
    if (!themeTool || !languageTool) throw new Error('Login WebMCP tools were not registered.')

    await themeTool.execute({ theme: 'dark' })
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('gvueter-lite-theme')).toBe('dark')

    await languageTool.execute({ language: 'en-US' })
    await nextTick()
    expect(root.textContent).toContain('Sign in to Dashboard')
    expect(document.documentElement.lang).toBe('en-US')

    await expect(themeTool.execute({ theme: 'invalid' })).rejects.toThrow()
    destroy()
    expect(themeTool.signal.aborted).toBe(true)
    expect(languageTool.signal.aborted).toBe(true)
  })
})
