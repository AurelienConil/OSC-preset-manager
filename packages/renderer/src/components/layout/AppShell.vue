<!-- Role: Vuetify app layout (sidebar + breadcrumb bar + content).
     Wires props/emits between its children, no own logic. -->
<script setup lang="ts">
import type { NavigationSection } from '../../navigation/types'
import AppBreadcrumbBar from './AppBreadcrumbBar.vue'
import AppContent from './AppContent.vue'
import AppSidebar from './AppSidebar.vue'

const props = defineProps<{
  sections: NavigationSection[]
  activeId: string
  collapsed: boolean
  isDark: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
  'toggle-collapse': []
  'toggle-theme': []
}>()

const activeLabel = () =>
  props.sections.find((section) => section.id === props.activeId)?.label ?? ''
</script>

<template>
  <v-app>
    <AppSidebar
      :sections="sections"
      :active-id="activeId"
      :collapsed="collapsed"
      @select="(id: string) => emit('select', id)"
      @toggle-collapse="emit('toggle-collapse')"
    />
    <AppBreadcrumbBar
      :title="activeLabel()"
      :is-dark="isDark"
      @toggle-theme="emit('toggle-theme')"
    />
    <AppContent :sections="sections" :active-id="activeId" />
  </v-app>
</template>
