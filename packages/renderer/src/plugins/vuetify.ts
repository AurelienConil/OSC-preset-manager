// Role: Vuetify instance — themes + component defaults.
// Theme colors mirror the CSS tokens of styles/tokens.css so the two systems
// (Vuetify `color` props and raw `var(--app-*)` usage) stay consistent.
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import '../styles/base.css'
import '../styles/vuetify-overrides.css'
import '../styles/app-classes.css'

// Semantic colors reused by both light and dark themes.
const shared = {
  accent: '#1e88d6',
  danger: '#e0392b',
  warn: '#d68910',
}

export const LIGHT_THEME = 'notion'
export const DARK_THEME = 'obsidianDark'

export default createVuetify({
  defaults: {
    // Applied to every component accepting these props.
    global: {
      density: 'compact',
    },
    // Per-component defaults (override `global`; still overridable inline).
    VBtn: { rounded: 'md', size: 'small' },
    VCard: { rounded: 'lg' },
    VTextField: { variant: 'outlined', hideDetails: true },
    VTextarea: { variant: 'outlined', hideDetails: true },
    VSelect: { variant: 'outlined', hideDetails: true },
    VCheckbox: { hideDetails: true, color: 'accent' },
    VSwitch: { hideDetails: true, color: 'accent' },
  },
  theme: {
    defaultTheme: LIGHT_THEME,
    themes: {
      // Light, warm-grey palette in the spirit of Notion.
      [LIGHT_THEME]: {
        dark: false,
        colors: {
          background: '#f2f0ec',
          surface: '#fbfaf7',
          primary: '#14895f',
          ...shared,
        },
      },
      // Dark palette in the spirit of Obsidian.
      [DARK_THEME]: {
        dark: true,
        colors: {
          background: '#1a1a1a',
          surface: '#242424',
          primary: '#7aa2f7',
          ...shared,
        },
      },
    },
  },
})
