<!-- Role: gallery showcase for v-tabs / v-window (placeholder panels). -->
<script setup lang="ts">
import { ref } from 'vue'

const tab = ref('1')
const tabs = [
  { id: '1', label: 'Onglet 1' },
  { id: '2', label: 'Onglet 2' },
  { id: '3', label: 'Onglet 3' },
]
</script>

<template>
  <v-card class="pa-4">
    <v-tabs v-model="tab" color="accent" class="mb-3">
      <v-tab v-for="item in tabs" :key="item.id" :value="item.id">{{ item.label }}</v-tab>
    </v-tabs>
    <v-window v-model="tab">
      <v-window-item v-for="item in tabs" :key="item.id" :value="item.id">
        <div class="section-sub">Contenu de {{ item.label }}.</div>
      </v-window-item>
    </v-window>
  </v-card>
</template>
