<!-- Role: single icon button toggling light/dark, driven by the parent's theme state. -->
<script setup lang="ts">
defineProps<{
  isDark: boolean
}>()

defineEmits<{
  toggle: []
}>()
</script>

<template>
  <v-btn
    variant="text"
    :icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
    :aria-label="isDark ? 'Activer le thème clair' : 'Activer le thème sombre'"
    @click="$emit('toggle')"
  />
</template>
