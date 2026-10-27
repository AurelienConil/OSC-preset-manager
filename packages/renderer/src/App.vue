<!-- Role: root component. Owns navigation/sidebar/theme state and the app-wide show state, wires them to AppShell. -->
<script setup lang="ts">
import { provideShow } from './composables/show-context'
import { useNavigation } from './composables/use-navigation'
import { useSidebarCollapse } from './composables/use-sidebar-collapse'
import { useTheme } from './composables/use-theme'
import { navigationSections } from './navigation/sections'
import AppShell from './components/layout/AppShell.vue'
import TransportBar from './components/show/TransportBar.vue'

provideShow()

const { activeId, setActive } = useNavigation()
const { collapsed, toggleCollapsed } = useSidebarCollapse()
const { isDark, toggleTheme } = useTheme()
</script>

<template>
  <AppShell
    :sections="navigationSections"
    :active-id="activeId"
    :collapsed="collapsed"
    :is-dark="isDark"
    @select="setActive"
    @toggle-collapse="toggleCollapsed"
    @toggle-theme="toggleTheme"
  >
    <template #toolbar>
      <TransportBar />
    </template>
  </AppShell>
</template>
