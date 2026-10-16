// Role: local state for light/dark theme. Switching the Vuetify theme also
// swaps the CSS tokens, since tokens.css redeclares them under the
// .v-theme--obsidianDark class Vuetify puts on the app root.
// Must be called from a component setup (it uses Vuetify's own composable).
import { ref } from 'vue'
import { useTheme as useVuetifyTheme } from 'vuetify'
import { DARK_THEME, LIGHT_THEME } from '../plugins/vuetify'

export function useTheme() {
  const vuetifyTheme = useVuetifyTheme()
  const isDark = ref(vuetifyTheme.global.current.value.dark)

  function toggleTheme(): void {
    isDark.value = !isDark.value
    void vuetifyTheme.change(isDark.value ? DARK_THEME : LIGHT_THEME)
  }

  return { isDark, toggleTheme }
}
