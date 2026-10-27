<!-- Role: OSC ports of the show (input port, output target, output rate), fixed for the whole show. -->
<script setup lang="ts">
import { reactive, watch } from 'vue'
import { injectShow } from '../../composables/show-context'
import { useAsyncAction } from '../../composables/use-async-action'

const show = injectShow()
const { snapshot } = show
const { pending, errorMessage, run } = useAsyncAction()

const form = reactive({ inputPort: 0, host: '', outputPort: 0, outputRateHz: 0 })

watch(
  () => snapshot.value?.setup,
  (setup) => {
    if (!setup) return
    Object.assign(form, {
      inputPort: setup.inputPort,
      host: setup.output.host,
      outputPort: setup.output.port,
      outputRateHz: setup.outputRateHz,
    })
  },
  { immediate: true },
)

function save(): void {
  const setup = snapshot.value?.setup
  if (!setup) return
  void run(() =>
    show.updateSetup({
      ...setup,
      inputPort: Number(form.inputPort),
      output: { host: form.host.trim(), port: Number(form.outputPort) },
      outputRateHz: Number(form.outputRateHz),
    }),
  )
}
</script>

<template>
  <v-card class="pa-4">
    <div class="section-title mb-1">
      <v-icon size="18">mdi-lan</v-icon>
      Ports OSC
    </div>
    <div class="section-sub mb-3">Fixés pour tout le show : à régler avant le spectacle.</div>

    <v-alert v-if="snapshot?.io.error" type="error" variant="tonal" class="mb-3">{{ snapshot.io.error }}</v-alert>
    <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-3" closable>{{ errorMessage }}</v-alert>

    <form class="d-flex flex-column ga-3" @submit.prevent="save">
      <v-text-field v-model.number="form.inputPort" type="number" label="Port d'entrée (UDP)" />
      <div class="d-flex ga-2">
        <v-text-field v-model="form.host" label="Hôte de sortie" />
        <v-text-field v-model.number="form.outputPort" type="number" label="Port de sortie" class="field-narrow" />
      </div>
      <v-text-field v-model.number="form.outputRateHz" type="number" label="Cadence d'envoi (Hz)" />
      <div class="d-flex">
        <v-spacer />
        <v-btn type="submit" variant="tonal" color="accent" :loading="pending">Appliquer</v-btn>
      </div>
    </form>
  </v-card>
</template>
