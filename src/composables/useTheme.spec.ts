import { describe, expect, it, beforeEach } from 'vite-plus/test'
import { useTheme } from './useTheme'

// AI modified: tests covering theme toggling and document class synchronization.
describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('initializes and toggles theme state correctly', () => {
    const { isDark, toggleTheme, setTheme } = useTheme()

    expect(typeof isDark.value).toBe('boolean')

    const initial = isDark.value
    toggleTheme()
    expect(isDark.value).toBe(!initial)
    expect(document.documentElement.classList.contains('dark')).toBe(!initial)

    setTheme(true)
    expect(isDark.value).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('gvueter-lite-theme')).toBe('dark')

    setTheme(false)
    expect(isDark.value).toBe(false)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('gvueter-lite-theme')).toBe('light')
  })
})
