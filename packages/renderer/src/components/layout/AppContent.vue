<!-- Role: renders the active section's page component (routing without a router). -->
<script setup lang="ts">
import type { NavigationSection } from '../../navigation/types'

const props = defineProps<{
  sections: NavigationSection[]
  activeId: string
}>()

const activeSection = () => props.sections.find((section) => section.id === props.activeId)
</script>

<template>
  <v-main>
    <v-container fluid class="app-content-container pa-6">
      <component :is="activeSection()?.component" />
    </v-container>
  </v-main>
</template>
