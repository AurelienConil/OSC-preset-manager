<!-- Role: example page of the two demo plugins (OSC, weather). Assembles their cards, no own logic. -->
<!-- EXAMPLE — UI of the example plugins (osc, weather), for demonstration only: delete with them (CLAUDE.md §5.1). -->
<script setup lang="ts">
import OscServerCard from './example/OscServerCard.vue'
import WeatherCard from './example/WeatherCard.vue'
</script>

<template>
  <div class="mb-5">
    <div class="page-title text-h5 mb-1">
      Exemple de plugins
    </div>
    <div class="section-sub">
      Deux plugins indépendants, reliés uniquement par le mediator de l'application
      (<span class="mono">packages/main/src/app-wiring.ts</span>). À supprimer pour un vrai projet.
    </div>
  </div>

  <v-row>
    <v-col cols="12" md="7">
      <OscServerCard />
    </v-col>
    <v-col cols="12" md="5">
      <WeatherCard />
    </v-col>
  </v-row>
</template>
