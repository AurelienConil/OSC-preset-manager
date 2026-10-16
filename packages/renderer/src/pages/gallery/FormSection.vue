<!-- Role: gallery showcase for the form controls (text field, select, switch, checkbox). -->
<script setup lang="ts">
import { ref } from 'vue'

const text = ref('')
const selected = ref<string | null>(null)
const enabled = ref(false)
</script>

<template>
  <v-card class="pa-4">
    <div class="section-title mb-3">
      <v-icon size="18">mdi-form-textbox</v-icon>
      Formulaire
    </div>
    <v-text-field v-model="text" label="Champ texte" class="mb-2" />
    <v-select
      v-model="selected"
      label="Sélectionner…"
      class="mb-2"
      :items="[
        { title: 'Option A', value: 'a' },
        { title: 'Option B', value: 'b' },
      ]"
    />
    <div class="d-flex align-center ga-4">
      <v-checkbox label="Coché" />
      <v-switch v-model="enabled" label="Activé" />
    </div>
  </v-card>
</template>
