import { defineStore } from 'pinia'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'lotio-theme'

function getStoredTheme(): Theme {
  if (!import.meta.client) return 'dark'
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {}
  return 'dark'
}

function applyThemeClass(theme: Theme): void {
  if (!import.meta.client) return
  const root = document.documentElement
  if (theme === 'light') {
    root.classList.add('light')
  } else {
    root.classList.remove('light')
  }
}

export const useThemeStore = defineStore('theme', {
  state: () => ({
    theme: 'dark' as Theme,
  }),

  getters: {
    isDark: (state) => state.theme === 'dark',
    isLight: (state) => state.theme === 'light',
  },

  actions: {
    init() {
      this.theme = getStoredTheme()
      applyThemeClass(this.theme)
    },

    toggle() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(STORAGE_KEY, this.theme)
      } catch {}
      applyThemeClass(this.theme)
    },

    setTheme(theme: Theme) {
      this.theme = theme
      try {
        localStorage.setItem(STORAGE_KEY, theme)
      } catch {}
      applyThemeClass(theme)
    },
  },
})
