<!-- Role: a single placeholder statistic card. -->
<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    value?: string
  }>(),
  { value: '—' },
)
</script>

<template>
  <v-card class="pa-4">
    <div class="section-sub">{{ label }}</div>
    <div class="stat-value mt-1">{{ value }}</div>
  </v-card>
</template>
