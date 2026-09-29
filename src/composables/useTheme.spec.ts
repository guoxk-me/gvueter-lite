import { describe, expect, it, beforeEach } from 'vite-plus/test'
import { useTheme } from './useTheme'

// AI modified: test explicit choices and the persisted System choice.
describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('applies and persists light, dark, and system theme choices', () => {
    const { isDark, themeMode, setTheme } = useTheme()

    expect(typeof isDark.value).toBe('boolean')

    setTheme('dark')
    expect(themeMode.value).toBe('dark')
    expect(isDark.value).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('gvueter-lite-theme')).toBe('dark')

    setTheme('light')
    expect(isDark.value).toBe(false)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('gvueter-lite-theme')).toBe('light')

    setTheme('system')
    expect(themeMode.value).toBe('system')
    expect(localStorage.getItem('gvueter-lite-theme')).toBe('system')
  })

  it('cycles light, dark, system, and back to light in one click each', () => {
    const { themeMode, setTheme, cycleTheme } = useTheme()
    setTheme('light')

    cycleTheme()
    expect(themeMode.value).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    cycleTheme()
    expect(themeMode.value).toBe('system')
    expect(localStorage.getItem('gvueter-lite-theme')).toBe('system')

    cycleTheme()
    expect(themeMode.value).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
