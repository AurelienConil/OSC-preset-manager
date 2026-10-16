<!-- Role: OSC example card: choose the port, start / stop the server, list the last received messages. -->
<!-- EXAMPLE — UI of the example plugins (osc, weather), for demonstration only: delete with them (CLAUDE.md §5.1). -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useOsc } from '@template/plugin-osc/frontend'
import { DEFAULT_OSC_PORT } from '@template/plugin-osc/dto'
import { useAsyncAction } from '../../composables/use-async-action'

const { status, messages, start, stop } = useOsc()
const { pending, errorMessage, run } = useAsyncAction()
const port = ref(DEFAULT_OSC_PORT)
const running = computed(() => status.value?.running === true)

const toggleServer = () => run(() => (running.value ? stop() : start(port.value)))
const formatTime = (isoTimestamp: string) => new Date(isoTimestamp).toLocaleTimeString()
</script>

<template>
  <v-card class="pa-4">
    <div class="section-title mb-1">
      <v-icon size="18">mdi-access-point</v-icon>
      Serveur OSC
    </div>
    <div class="section-sub mb-3">
      Reçoit des messages OSC en UDP. Envoyez
      <span class="mono">/weather/city "Lyon"</span> pour changer la ville de la carte Météo.
    </div>

    <div class="d-flex align-center ga-2 mb-3">
      <v-text-field v-model.number="port" type="number" label="Port UDP" :disabled="running" class="field-narrow" />
      <v-btn
        variant="tonal"
        :color="running ? 'danger' : 'accent'"
        :prepend-icon="running ? 'mdi-stop' : 'mdi-play'"
        :loading="pending"
        @click="toggleServer"
      >
        {{ running ? 'Arrêter' : 'Démarrer' }}
      </v-btn>
      <v-chip size="small" variant="tonal" :color="running ? 'success' : undefined">
        {{ running ? `En écoute sur le port ${status?.port}` : 'Arrêté' }}
      </v-chip>
    </div>

    <v-alert v-if="errorMessage ?? status?.error" type="error" variant="tonal" class="mb-3">
      {{ errorMessage ?? status?.error }}
    </v-alert>

    <v-table v-if="messages.length > 0" class="scroll-list">
      <thead>
        <tr>
          <th>Heure</th>
          <th>Adresse</th>
          <th>Arguments</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(message, index) in messages" :key="`${message.receivedAt}-${index}`">
          <td class="mono">{{ formatTime(message.receivedAt) }}</td>
          <td class="mono cell-strong">{{ message.address }}</td>
          <td class="mono">{{ JSON.stringify(message.args) }}</td>
        </tr>
      </tbody>
    </v-table>
    <div v-else class="section-sub">Aucun message reçu.</div>
  </v-card>
</template>
