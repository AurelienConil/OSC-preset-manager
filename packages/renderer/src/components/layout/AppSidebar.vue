<!-- Role: retractable navigation drawer (nav items + collapse button); always icons-only on a phone. -->
<script setup lang="ts">
import { useDisplay } from 'vuetify'
import type { NavigationSection } from '../../navigation/types'

defineProps<{
  sections: NavigationSection[]
  activeId: string
  collapsed: boolean
}>()

defineEmits<{
  select: [id: string]
  'toggle-collapse': []
}>()

const { smAndDown } = useDisplay()
</script>

<template>
  <!-- `rail` is Vuetify's built-in collapsed state: icons only, no labels. -->
  <v-navigation-drawer permanent :rail="collapsed || smAndDown" width="220" class="app-sidebar">
    <div v-if="!collapsed && !smAndDown" class="app-nav-label">Navigation</div>
    <v-list nav>
      <v-list-item
        v-for="section in sections"
        :key="section.id"
        :prepend-icon="section.icon"
        :title="section.label"
        :active="section.id === activeId"
        @click="$emit('select', section.id)"
      />
    </v-list>

    <template #append>
      <v-list nav>
        <v-list-item
          v-if="!smAndDown"
          :prepend-icon="collapsed ? 'mdi-chevron-right' : 'mdi-chevron-left'"
          title="Réduire"
          @click="$emit('toggle-collapse')"
        />
      </v-list>
    </template>
  </v-navigation-drawer>
</template>
