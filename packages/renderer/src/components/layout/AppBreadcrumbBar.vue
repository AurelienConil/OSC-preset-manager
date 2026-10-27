<!-- Role: top bar showing the active section's breadcrumb, the app toolbar (default slot) and the theme toggle. -->
<script setup lang="ts">
import ThemeToggle from '../ui/ThemeToggle.vue'

defineProps<{
  title: string
  isDark: boolean
}>()

defineEmits<{
  'toggle-theme': []
}>()
</script>

<template>
  <v-app-bar flat height="52" class="app-breadcrumb-bar">
    <v-app-bar-title class="app-breadcrumb-title d-none d-md-flex">
      <v-icon size="16" class="icon-muted mr-1">mdi-pound</v-icon>
      {{ title }}
    </v-app-bar-title>

    <v-spacer />

    <slot />

    <ThemeToggle :is-dark="isDark" class="mr-2" @toggle="$emit('toggle-theme')" />
  </v-app-bar>
</template>
