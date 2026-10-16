<!-- Role: gallery showcase for v-dialog (placeholder title/content). -->
<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>

<template>
  <v-card class="pa-4">
    <div class="section-title mb-3">
      <v-icon size="18">mdi-window-restore</v-icon>
      Dialog
    </div>
    <v-btn color="accent" variant="flat" @click="open = true">Ouvrir le dialog</v-btn>

    <v-dialog v-model="open" max-width="420">
      <v-card class="pa-4">
        <div class="section-title mb-2">Titre du dialog</div>
        <div class="section-sub mb-4">Contenu de démonstration.</div>
        <div class="d-flex justify-end">
          <v-btn variant="tonal" @click="open = false">Fermer</v-btn>
        </div>
      </v-card>
    </v-dialog>
  </v-card>
</template>
