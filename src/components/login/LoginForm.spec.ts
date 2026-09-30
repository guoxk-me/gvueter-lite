import { createApp, nextTick } from 'vue'
import { beforeEach, describe, expect, it } from 'vite-plus/test'
import LoginForm, { type LoginPayload } from './LoginForm.vue'
import { i18n, setLocale } from '@/i18n'

// AI modified: unit tests for LoginForm validation, event emissions, and password visibility toggling.
describe('LoginForm', () => {
  beforeEach(() => {
    setLocale('zh-CN')
  })
  function mountLoginForm() {
    const root = document.createElement('div')
    document.body.appendChild(root)

    const emitted: {
      submit?: LoginPayload[]
      'forgot-password'?: boolean[]
      'contact-support'?: boolean[]
    } = {}

    const app = createApp(LoginForm, {
      onSubmit: (payload: LoginPayload) => {
        emitted.submit = emitted.submit || []
        emitted.submit.push(payload)
      },
      onForgotPassword: () => {
        emitted['forgot-password'] = emitted['forgot-password'] || []
        emitted['forgot-password'].push(true)
      },
      onContactSupport: () => {
        emitted['contact-support'] = emitted['contact-support'] || []
        emitted['contact-support'].push(true)
      },
    })
    app.use(i18n)
    const vm = app.mount(root)

    return {
      root,
      vm,
      emitted,
      destroy: () => {
        app.unmount()
        root.remove()
      },
    }
  }

  it('shows required validation error when submitting with empty fields', async () => {
    const { root, emitted, destroy } = mountLoginForm()

    const form = root.querySelector('form') as HTMLFormElement
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await nextTick()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))

    expect(emitted.submit).toBeUndefined()
    expect(root.textContent).toContain('请输入工作邮箱')
    expect(root.textContent).toContain('请输入登录密码')

    destroy()
  })

  it('shows error on invalid email address', async () => {
    const { root, emitted, destroy } = mountLoginForm()

    const emailInput = root.querySelector('#work-email') as HTMLInputElement
    emailInput.value = 'invalid-email-address'
    emailInput.dispatchEvent(new Event('input', { bubbles: true }))
    emailInput.dispatchEvent(new Event('blur', { bubbles: true }))
    await nextTick()

    const form = root.querySelector('form') as HTMLFormElement
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await nextTick()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))

    expect(emitted.submit).toBeUndefined()
    expect(root.textContent).toContain('请输入有效的邮箱地址')

    destroy()
  })

  it('validates an untouched field on blur and clears its error after correction', async () => {
    const { root, destroy } = mountLoginForm()

    const emailInput = root.querySelector('#work-email') as HTMLInputElement
    emailInput.dispatchEvent(new Event('blur', { bubbles: true }))
    await nextTick()
    expect(root.textContent).toContain('请输入工作邮箱')

    emailInput.value = 'alex@acme.corp'
    emailInput.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()
    expect(root.textContent).not.toContain('请输入工作邮箱')

    destroy()
  })

  it('toggles password input visibility between password and text', async () => {
    const { root, destroy } = mountLoginForm()

    const passwordInput = root.querySelector('#password') as HTMLInputElement
    expect(passwordInput.type).toBe('password')

    const toggleButton = passwordInput.parentElement?.querySelector('button') as HTMLButtonElement
    toggleButton.click()
    await nextTick()

    expect(passwordInput.type).toBe('text')

    toggleButton.click()
    await nextTick()

    expect(passwordInput.type).toBe('password')

    destroy()
  })

  it('emits submit event with valid credentials', async () => {
    const { root, emitted, destroy } = mountLoginForm()

    const emailInput = root.querySelector('#work-email') as HTMLInputElement
    emailInput.value = 'alex@acme.corp'
    emailInput.dispatchEvent(new Event('input', { bubbles: true }))

    const passwordInput = root.querySelector('#password') as HTMLInputElement
    passwordInput.value = 'SecretP@ss123'
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }))

    const form = root.querySelector('form') as HTMLFormElement
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await nextTick()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))

    expect(emitted.submit).toBeDefined()
    expect(emitted.submit?.[0]).toEqual({
      email: 'alex@acme.corp',
      password: 'SecretP@ss123',
      rememberMe: false,
    })

    destroy()
  })

  it('includes the remember-me choice in the submit event', async () => {
    const { root, emitted, destroy } = mountLoginForm()

    const emailInput = root.querySelector('#work-email') as HTMLInputElement
    emailInput.value = 'alex@acme.corp'
    emailInput.dispatchEvent(new Event('input', { bubbles: true }))

    const passwordInput = root.querySelector('#password') as HTMLInputElement
    passwordInput.value = 'SecretP@ss123'
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }))

    const rememberMe = root.querySelector('[role="checkbox"]') as HTMLElement
    rememberMe.click()
    await nextTick()

    const form = root.querySelector('form') as HTMLFormElement
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await new Promise<void>((resolve) => setTimeout(resolve, 0))

    expect(emitted.submit?.[0]?.rememberMe).toBe(true)

    destroy()
  })
})
