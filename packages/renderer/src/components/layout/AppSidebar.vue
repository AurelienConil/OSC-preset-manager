<!-- Role: retractable navigation drawer (nav items + inert Help/Account footer). -->
<script setup lang="ts">
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
</script>

<template>
  <!-- `rail` is Vuetify's built-in collapsed state: icons only, no labels. -->
  <v-navigation-drawer permanent :rail="collapsed" width="220" class="app-sidebar">
    <div v-if="!collapsed" class="app-nav-label">Navigation</div>
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
        <v-list-item prepend-icon="mdi-help-circle-outline" title="Aide" />
        <v-list-item prepend-icon="mdi-account-outline" title="Compte" />
        <v-list-item
          :prepend-icon="collapsed ? 'mdi-chevron-right' : 'mdi-chevron-left'"
          title="Réduire"
          @click="$emit('toggle-collapse')"
        />
      </v-list>
    </template>
  </v-navigation-drawer>
</template>
