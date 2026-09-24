import { ref } from 'vue'

const isDark = ref(false)
let isInitialized = false

// AI modified: extracted shared theme state so both Basic and Core routes share the theme synchronously.
export function useTheme() {
  if (!isInitialized && typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem('gvueter-lite-theme')
    const prefersDark =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    isDark.value = savedTheme === 'dark' || (!savedTheme && prefersDark)
    document.documentElement.classList.toggle('dark', isDark.value)
    isInitialized = true
  }

  function toggleTheme(): void {
    isDark.value = !isDark.value
    document.documentElement.classList.toggle('dark', isDark.value)
    localStorage.setItem('gvueter-lite-theme', isDark.value ? 'dark' : 'light')
  }

  function setTheme(dark: boolean): void {
    isDark.value = dark
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('gvueter-lite-theme', dark ? 'dark' : 'light')
  }

  return {
    isDark,
    toggleTheme,
    setTheme,
  }
}
