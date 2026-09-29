import { ref } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

const themeMode = ref<ThemeMode>('system')
const isDark = ref(false)
let isInitialized = false

function applyTheme(): void {
  const prefersDark =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  isDark.value = themeMode.value === 'dark' || (themeMode.value === 'system' && prefersDark)
  document.documentElement.classList.toggle('dark', isDark.value)
}

// AI modified: System tracks OS changes while explicit Light and Dark choices stay persistent.
export function useTheme() {
  if (!isInitialized && typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem('gvueter-lite-theme')
    themeMode.value = savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'system'
    applyTheme()
    if (typeof window.matchMedia === 'function') {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme)
    }
    isInitialized = true
  }

  function setTheme(mode: ThemeMode): void {
    themeMode.value = mode
    applyTheme()
    localStorage.setItem('gvueter-lite-theme', mode)
  }

  // AI modified: one click advances through all three themes without a menu.
  function cycleTheme(): void {
    setTheme(themeMode.value === 'light' ? 'dark' : themeMode.value === 'dark' ? 'system' : 'light')
  }

  return { themeMode, isDark, setTheme, cycleTheme }
}
