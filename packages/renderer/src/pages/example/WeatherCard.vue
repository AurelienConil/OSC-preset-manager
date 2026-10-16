<!-- Role: weather example card: choose a city and show today's temperatures. -->
<!-- EXAMPLE — UI of the example plugins (osc, weather), for demonstration only: delete with them (CLAUDE.md §5.1). -->
<script setup lang="ts">
import { ref } from 'vue'
import { useWeather } from '@template/plugin-weather/frontend'
import { useAsyncAction } from '../../composables/use-async-action'

const { report, setCity } = useWeather()
const { pending, errorMessage, run } = useAsyncAction()
const city = ref('')

const submitCity = () => run(() => setCity(city.value))
const formatCelsius = (value: number) => `${Math.round(value)} °C`
</script>

<template>
  <v-card class="pa-4">
    <div class="section-title mb-1">
      <v-icon size="18">mdi-weather-partly-cloudy</v-icon>
      Météo
    </div>
    <div class="section-sub mb-3">
      Température du jour, via l'API gratuite Open-Meteo. La ville peut aussi changer par un message OSC.
    </div>

    <form class="d-flex align-center ga-2 mb-3" @submit.prevent="submitCity">
      <v-text-field v-model="city" label="Ville" />
      <v-btn type="submit" variant="tonal" color="accent" :loading="pending">Afficher</v-btn>
    </form>

    <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-3">{{ errorMessage }}</v-alert>

    <div v-if="report">
      <div class="section-sub">
        {{ report.city }}<template v-if="report.country">, {{ report.country }}</template> — {{ report.date }}
      </div>
      <div class="stat-value mt-1">{{ formatCelsius(report.currentCelsius) }}</div>
      <div class="section-sub">
        min {{ formatCelsius(report.minCelsius) }} · max {{ formatCelsius(report.maxCelsius) }}
      </div>
    </div>
    <div v-else class="section-sub">Aucune ville choisie.</div>
  </v-card>
</template>
