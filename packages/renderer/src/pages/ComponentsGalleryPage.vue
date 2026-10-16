<!-- Role: design system showcase page. Assembles the gallery sub-sections, no own logic. -->
<script setup lang="ts">
import DialogSection from './gallery/DialogSection.vue'
import FormSection from './gallery/FormSection.vue'
import MiscSection from './gallery/MiscSection.vue'
import StatsSection from './gallery/StatsSection.vue'
import TableSection from './gallery/TableSection.vue'
import TabsSection from './gallery/TabsSection.vue'
</script>

<template>
  <div class="mb-5">
    <div class="page-title text-h5 mb-1">
      Composants Vuetify
    </div>
    <div class="section-sub">
      Gabarit de démarrage : chaque bloc montre la forme et l'état par défaut d'un composant.
      Couleurs, rayons et densité dérivent des variables CSS de
      <span class="mono">:root</span>.
    </div>
  </div>

  <div class="d-flex flex-column ga-3">
    <StatsSection />
    <TableSection />
    <FormSection />
    <DialogSection />
    <TabsSection />
    <MiscSection />
  </div>
</template>
